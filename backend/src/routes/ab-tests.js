const express = require('express');
const Joi = require('joi');
const nativeRequest = require('../services/nativeRequest');
const pool = nativeRequest.requestPool(require('../db'));
const authMiddleware = require('../middleware/auth');
const { generateWithAI } = require('../services/openrouter');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);
nativeRequest.installNativeRequest(router);
router.use((req,res,next)=>{nativeRequest.beforeCommit(async client=>{const user=await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);if(!user.rows.length)throw Object.assign(new Error('The saved account is no longer available. Sign in again.'),{status:401});});next();});

const createSchema = Joi.object({
  campaign_id: Joi.number().integer().positive().optional(),
  product_description: Joi.string().min(10).max(2000).required(),
  target_audience: Joi.string().max(500).optional().allow(''),
  hypothesis: Joi.string().max(1000).optional().allow(''),
});

const winnerSchema = Joi.object({
  winner: Joi.string().valid('a', 'b', 'A', 'B').required(),
});

// POST /api/ab-tests - Generate A/B test variants and save to ab_tests table
router.post('/', async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { campaign_id, product_description, target_audience, hypothesis } = value;
    const userId = req.user.id;

    // Verify campaign_id belongs to user if provided
    if (campaign_id) {
      const campaignCheck = await pool.query(
        `SELECT id FROM campaigns WHERE id = $1 AND user_id = $2`,
        [campaign_id, userId]
      );
      if (campaignCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or does not belong to you.' });
      }
    }

    nativeRequest.beforeCommit(async client=>{if(campaign_id&&!(await client.query('SELECT id FROM campaigns WHERE id=$1 AND user_id=$2 FOR SHARE',[campaign_id,userId])).rows.length)throw Object.assign(new Error('The selected campaign changed during generation.'),{status:409});});
    const audienceContext = target_audience ? `Target audience: ${target_audience}` : '';

    const promptA = `Product: ${product_description}
${audienceContext}
Hypothesis: ${hypothesis || 'Not specified'}
Generate compelling headline variations for this product. Focus on clarity and value proposition.`;

    const promptB = `Product: ${product_description}
${audienceContext}
Hypothesis: ${hypothesis || 'Not specified'}
Generate persuasive ad copy for this product. Focus on emotional appeal and urgency.`;

    // Generate variant A (headlines) and variant B (ad_copies) in parallel
    const [responseA, responseB] = await Promise.all([
      generateWithAI('headlines', promptA),
      generateWithAI('ad_copies', promptB),
    ]);

    const variantA = {
      feature: 'headlines',
      content: responseA.result,
      raw: responseA.raw,
    };

    const variantB = {
      feature: 'ad_copies',
      content: responseB.result,
      raw: responseB.raw,
    };

    const tokensUsed = (responseA.tokensUsed || 0) + (responseB.tokensUsed || 0);

    // Save both variants to ab_tests table
    const saved = await pool.query(
      `INSERT INTO ab_tests (user_id, campaign_id, variant_a, variant_b, hypothesis,input)
       VALUES ($1, $2, $3, $4, $5,$6::jsonb) RETURNING *`,
      [userId, campaign_id || null, JSON.stringify(variantA), JSON.stringify(variantB), hypothesis || null,JSON.stringify(value)]
    );

    const abTestId = saved.rows[0].id;

    // Also persist each variant to generated_content for history, with ab_test_id reference
    await Promise.all([
      pool.query(
        `INSERT INTO generated_content (user_id, feature_type, prompt, result, tokens_used, ab_test_id, campaign_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, 'headlines', promptA, JSON.stringify(responseA.result), responseA.tokensUsed || 0, abTestId, campaign_id || null]
      ),
      pool.query(
        `INSERT INTO generated_content (user_id, feature_type, prompt, result, tokens_used, ab_test_id, campaign_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, 'ad_copies', promptB, JSON.stringify(responseB.result), responseB.tokensUsed || 0, abTestId, campaign_id || null]
      ),
    ]);

    // Update token usage
    if (tokensUsed > 0) {
      await pool.query(`
        INSERT INTO user_settings (user_id, tokens_used_this_month)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET tokens_used_this_month = user_settings.tokens_used_this_month + $2,
            updated_at = NOW()
      `, [userId, tokensUsed]);
    }

    res.status(201).json({
      ab_test: saved.rows[0],
      variant_a: variantA,
      variant_b: variantB,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('A/B test error:', err);
    if (err.message.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }
    res.status(err.status || 500).json({ error: 'Failed to run A/B test', details: err.message });
  }
});

// GET /api/ab-tests - list user's A/B tests with pagination
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ab_tests WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT id, user_id, campaign_id, variant_a, variant_b, winner, hypothesis, primary_metric, is_demo, demo_label, input, created_at
       FROM ab_tests WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List A/B tests error:', err);
    res.status(err.status || 500).json({ error: 'Failed to fetch A/B tests' });
  }
});

// GET /api/ab-tests/:id - Get single A/B test
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM ab_tests WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'A/B test not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Get A/B test error:', err);
    res.status(err.status || 500).json({ error: 'Failed to fetch A/B test' });
  }
});

// PATCH /api/ab-tests/:id/winner - Set winner for an A/B test
router.patch('/:id/winner', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const training=(await pool.query('SELECT is_demo FROM ab_tests WHERE id=$1 AND user_id=$2',[id,req.user.id])).rows[0];
    if(training?.is_demo)return res.status(409).json({error:'A fictional training draft cannot establish a real experiment winner.'});
    const { error, value } = winnerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE ab_tests SET winner = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [value.winner.toLowerCase(), id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'A/B test not found.' });
    }

    res.json({ ab_test: result.rows[0] });
  } catch (err) {
    console.error('Set winner error:', err);
    res.status(err.status || 500).json({ error: 'Failed to set winner' });
  }
});

// DELETE /api/ab-tests/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM ab_tests WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'A/B test not found.' });
    }

    res.json({ message: 'A/B test deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Delete A/B test error:', err);
    res.status(err.status || 500).json({ error: 'Failed to delete A/B test' });
  }
});

module.exports = router;
