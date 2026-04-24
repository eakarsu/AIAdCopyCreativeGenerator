const express = require('express');
const authMiddleware = require('../middleware/auth');
const { generateWithAI, SYSTEM_PROMPTS } = require('../services/openrouter');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  try {
    const { feature, prompt, context } = req.body;

    if (!feature) {
      return res.status(400).json({ error: 'Feature type is required' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!SYSTEM_PROMPTS[feature]) {
      return res.status(400).json({
        error: `Invalid feature: "${feature}". Allowed: ${Object.keys(SYSTEM_PROMPTS).join(', ')}`,
      });
    }

    const response = await generateWithAI(feature, prompt, context);

    res.json({
      feature,
      prompt,
      response: response.result,
      raw: response.raw,
    });
  } catch (err) {
    console.error('AI generate error:', err);

    if (err.message.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }

    res.status(500).json({ error: 'Failed to generate AI content', details: err.message });
  }
});

module.exports = router;
