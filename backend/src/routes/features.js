const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const ALLOWED_FEATURES = [
  'ad_copies', 'headlines', 'ab_tests', 'creative_briefs', 'target_audiences',
  'brand_voices', 'cta_texts', 'image_prompts', 'social_media_ads', 'email_copies',
  'landing_page_copies', 'campaign_strategies', 'competitor_analyses',
  'budget_optimizations', 'performance_predictions', 'brand_voice_check',
];

// All routes require auth
router.use(authMiddleware);

// Validation schemas
const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  feature_type: Joi.string().valid(...ALLOWED_FEATURES).optional(),
  search: Joi.string().max(200).optional().allow(''),
  campaign_id: Joi.number().integer().positive().optional(),
  is_favorite: Joi.boolean().optional(),
});

// GET /api/features/stats - count by feature_type for dashboard
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const [featureStats, totalGenToday, totalFavorites] = await Promise.all([
      pool.query(
        `SELECT feature_type, COUNT(*) as count
         FROM generated_content
         WHERE user_id = $1
         GROUP BY feature_type
         ORDER BY count DESC`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM generated_content
         WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM generated_content
         WHERE user_id = $1 AND is_favorite = true`,
        [userId]
      ),
    ]);

    const stats = {};
    let total = 0;
    featureStats.rows.forEach(row => {
      stats[row.feature_type] = parseInt(row.count, 10);
      total += parseInt(row.count, 10);
    });

    res.json({
      stats,
      total,
      generated_today: parseInt(totalGenToday.rows[0].count, 10),
      total_favorites: parseInt(totalFavorites.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/features - list user's generated_content with pagination, filter, and search
router.get('/', async (req, res) => {
  try {
    const { error, value } = listSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;
    const { page, limit, feature_type, search, campaign_id, is_favorite } = value;
    const offset = (page - 1) * limit;

    const params = [userId];
    const conditions = ['user_id = $1'];

    if (feature_type) {
      params.push(feature_type);
      conditions.push(`feature_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(prompt ILIKE $${params.length} OR result::text ILIKE $${params.length})`);
    }

    if (campaign_id !== undefined) {
      params.push(campaign_id);
      conditions.push(`campaign_id = $${params.length}`);
    }

    if (is_favorite !== undefined) {
      params.push(is_favorite);
      conditions.push(`is_favorite = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM generated_content ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await pool.query(
      `SELECT id, user_id, feature_type, prompt, result, tokens_used, campaign_id, ab_test_id, is_favorite, created_at
       FROM generated_content ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List generated_content error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/features/:id - get single generated_content (user-scoped)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, user_id, feature_type, prompt, result, tokens_used, campaign_id, ab_test_id, is_favorite, created_at
       FROM generated_content WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Get generated_content error:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// PATCH /api/features/:id/favorite - Toggle favorite status
router.patch('/:id/favorite', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE generated_content
       SET is_favorite = NOT is_favorite
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_favorite`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ id: result.rows[0].id, is_favorite: result.rows[0].is_favorite });
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// DELETE /api/features/:id - delete (user ownership check)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM generated_content WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Delete generated_content error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
