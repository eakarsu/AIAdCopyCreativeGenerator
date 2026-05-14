const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

const campaignSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional().allow(''),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'archived').default('draft'),
  objective: Joi.string().max(500).optional().allow(''),
  budget: Joi.string().max(100).optional().allow(''),
  start_date: Joi.date().iso().optional().allow(null),
  end_date: Joi.date().iso().optional().allow(null),
});

const updateSchema = campaignSchema.fork(
  ['name'],
  (schema) => schema.optional()
);

// GET /api/campaigns - List user campaigns with pagination
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    const params = [userId];
    let whereClause = 'WHERE c.user_id = $1';

    if (status) {
      params.push(status);
      whereClause += ` AND c.status = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM campaigns c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.status, c.objective, c.budget,
              c.start_date, c.end_date, c.created_at, c.updated_at,
              COUNT(gc.id) as content_count
       FROM campaigns c
       LEFT JOIN generated_content gc ON gc.campaign_id = c.id
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List campaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id - Get single campaign with content
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const [campaignRes, contentRes, abTestRes] = await Promise.all([
      pool.query(
        `SELECT * FROM campaigns WHERE id = $1 AND user_id = $2`,
        [id, userId]
      ),
      pool.query(
        `SELECT id, feature_type, prompt, result, tokens_used, created_at
         FROM generated_content WHERE campaign_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [id]
      ),
      pool.query(
        `SELECT id, variant_a, variant_b, winner, hypothesis, created_at
         FROM ab_tests WHERE campaign_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        [id, userId]
      ),
    ]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      data: {
        ...campaignRes.rows[0],
        content: contentRes.rows,
        ab_tests: abTestRes.rows,
      },
    });
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns - Create campaign
router.post('/', async (req, res) => {
  try {
    const { error, value } = campaignSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;
    const { name, description, status, objective, budget, start_date, end_date } = value;

    const result = await pool.query(
      `INSERT INTO campaigns (user_id, name, description, status, objective, budget, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, name, description || null, status, objective || null, budget || null, start_date || null, end_date || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;

    // Check ownership
    const existing = await pool.query(
      `SELECT id FROM campaigns WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const fields = [];
    const params = [];
    const allowedFields = ['name', 'description', 'status', 'objective', 'budget', 'start_date', 'end_date'];

    allowedFields.forEach(field => {
      if (value[field] !== undefined) {
        params.push(value[field] || null);
        fields.push(`${field} = $${params.length}`);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id, userId);
    const result = await pool.query(
      `UPDATE campaigns SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
      params
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Update campaign error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM campaigns WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
