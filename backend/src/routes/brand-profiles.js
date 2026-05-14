const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

const profileSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  industry: Joi.string().max(255).optional().allow(''),
  tone_of_voice: Joi.string().max(1000).optional().allow(''),
  target_persona: Joi.string().max(1000).optional().allow(''),
  competitor_names: Joi.string().max(500).optional().allow(''),
  brand_guidelines: Joi.string().max(5000).optional().allow(''),
  is_active: Joi.boolean().optional(),
});

// GET /api/brand-profiles
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM brand_profiles WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC`,
      [userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List brand profiles error:', err);
    res.status(500).json({ error: 'Failed to fetch brand profiles' });
  }
});

// POST /api/brand-profiles
router.post('/', async (req, res) => {
  try {
    const { error, value } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;
    const { name, industry, tone_of_voice, target_persona, competitor_names, brand_guidelines, is_active } = value;

    // If setting as active, deactivate others first
    if (is_active) {
      await pool.query(`UPDATE brand_profiles SET is_active = false WHERE user_id = $1`, [userId]);
    }

    const result = await pool.query(
      `INSERT INTO brand_profiles (user_id, name, industry, tone_of_voice, target_persona, competitor_names, brand_guidelines, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, name, industry || null, tone_of_voice || null, target_persona || null, competitor_names || null, brand_guidelines || null, is_active || false]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Create brand profile error:', err);
    res.status(500).json({ error: 'Failed to create brand profile' });
  }
});

// PUT /api/brand-profiles/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const { error, value } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;

    const existing = await pool.query(
      `SELECT id FROM brand_profiles WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    // If setting as active, deactivate others first
    if (value.is_active) {
      await pool.query(`UPDATE brand_profiles SET is_active = false WHERE user_id = $1`, [userId]);
    }

    const result = await pool.query(
      `UPDATE brand_profiles
       SET name = $1, industry = $2, tone_of_voice = $3, target_persona = $4,
           competitor_names = $5, brand_guidelines = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [
        value.name, value.industry || null, value.tone_of_voice || null,
        value.target_persona || null, value.competitor_names || null,
        value.brand_guidelines || null, value.is_active || false,
        id, userId,
      ]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Update brand profile error:', err);
    res.status(500).json({ error: 'Failed to update brand profile' });
  }
});

// PATCH /api/brand-profiles/:id/activate - Set as active profile
router.patch('/:id/activate', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    await pool.query(`UPDATE brand_profiles SET is_active = false WHERE user_id = $1`, [userId]);

    const result = await pool.query(
      `UPDATE brand_profiles SET is_active = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Activate brand profile error:', err);
    res.status(500).json({ error: 'Failed to activate brand profile' });
  }
});

// DELETE /api/brand-profiles/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM brand_profiles WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    res.json({ message: 'Brand profile deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Delete brand profile error:', err);
    res.status(500).json({ error: 'Failed to delete brand profile' });
  }
});

module.exports = router;
