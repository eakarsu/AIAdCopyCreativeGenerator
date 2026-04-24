const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const ALLOWED_FEATURES = [
  'ad_copies',
  'headlines',
  'ab_tests',
  'creative_briefs',
  'target_audiences',
  'brand_voices',
  'cta_texts',
  'image_prompts',
  'social_media_ads',
  'email_copies',
  'landing_page_copies',
  'campaign_strategies',
  'competitor_analyses',
  'budget_optimizations',
  'performance_predictions',
];

function validateFeature(req, res, next) {
  const { feature } = req.params;
  if (!ALLOWED_FEATURES.includes(feature)) {
    return res.status(400).json({ error: `Invalid feature: "${feature}". Allowed: ${ALLOWED_FEATURES.join(', ')}` });
  }
  next();
}

// All routes require auth
router.use(authMiddleware);

// GET /api/features/:feature - list with pagination and search
router.get('/:feature', validateFeature, async (req, res) => {
  try {
    const { feature } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    const platform = req.query.platform || '';

    let whereClause = '';
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR content::text ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (platform) {
      params.push(platform);
      conditions.push(`platform = $${params.length}`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${feature} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await pool.query(
      `SELECT * FROM ${feature} ${whereClause} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
    console.error(`List ${req.params.feature} error:`, err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/features/:feature/:id - get single item
router.get('/:feature/:id', validateFeature, async (req, res) => {
  try {
    const { feature, id } = req.params;
    const result = await pool.query(`SELECT * FROM ${feature} WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(`Get ${req.params.feature} error:`, err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/features/:feature - create new item
router.post('/:feature', validateFeature, async (req, res) => {
  try {
    const { feature } = req.params;
    const { title, content, category, status, platform } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO ${feature} (title, content, category, status, platform) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        title,
        typeof content === 'string' ? content : JSON.stringify(content || {}),
        category || null,
        status || 'active',
        platform || null,
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(`Create ${req.params.feature} error:`, err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/features/:feature/:id - update item
router.put('/:feature/:id', validateFeature, async (req, res) => {
  try {
    const { feature, id } = req.params;
    const { title, content, category, status, platform } = req.body;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      params.push(typeof content === 'string' ? content : JSON.stringify(content));
    }
    if (category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (platform !== undefined) {
      fields.push(`platform = $${paramIndex++}`);
      params.push(platform);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE ${feature} SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(`Update ${req.params.feature} error:`, err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/features/:feature/:id - delete item
router.delete('/:feature/:id', validateFeature, async (req, res) => {
  try {
    const { feature, id } = req.params;
    const result = await pool.query(`DELETE FROM ${feature} WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully', data: result.rows[0] });
  } catch (err) {
    console.error(`Delete ${req.params.feature} error:`, err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
