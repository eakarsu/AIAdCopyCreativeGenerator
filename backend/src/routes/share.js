const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/share/:token - Public endpoint, no auth required
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid share token' });
    }

    const result = await pool.query(
      `SELECT st.token, st.expires_at, st.view_count,
              gc.id as content_id, gc.feature_type, gc.prompt, gc.result, gc.created_at as content_created_at,
              u.name as author_name
       FROM share_tokens st
       JOIN generated_content gc ON gc.id = st.generated_content_id
       JOIN users u ON u.id = st.user_id
       WHERE st.token = $1 AND st.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found or has expired' });
    }

    // Increment view count
    await pool.query(
      `UPDATE share_tokens SET view_count = view_count + 1 WHERE token = $1`,
      [token]
    );

    const row = result.rows[0];
    res.json({
      content: {
        id: row.content_id,
        feature_type: row.feature_type,
        prompt: row.prompt,
        result: row.result,
        created_at: row.content_created_at,
        author_name: row.author_name,
      },
      shared_at: row.content_created_at,
      expires_at: row.expires_at,
      view_count: row.view_count + 1,
    });
  } catch (err) {
    console.error('Share view error:', err);
    res.status(500).json({ error: 'Failed to load shared content' });
  }
});

module.exports = router;
