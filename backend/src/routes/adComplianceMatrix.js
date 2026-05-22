const express = require('express');
const router = express.Router();

router.post('/check', (req, res) => {
  const copy = String(req.body?.copy || 'Lose 20 pounds fast with guaranteed results. Limited time only!');
  const platform = String(req.body?.platform || 'meta').toLowerCase();
  const rules = [
    { id: 'absolute_claim', regex: /guaranteed|always|never|best/i, severity: 24 },
    { id: 'body_attribute', regex: /lose \d+ pounds|before and after|fat/i, severity: 26 },
    { id: 'urgency_pressure', regex: /limited time|act now|only today/i, severity: 10 },
    { id: 'personal_attribute', regex: /are you (broke|overweight|single|depressed)/i, severity: 20 },
  ];
  const findings = rules.filter((rule) => rule.regex.test(copy)).map((rule) => ({ id: rule.id, severity: rule.severity }));
  const score = Math.min(100, findings.reduce((sum, item) => sum + item.severity, 0) + (platform === 'meta' ? 8 : 0));
  res.json({ platform, score, status: score >= 50 ? 'revise_before_upload' : 'likely_acceptable', findings, rewriteHint: findings.length ? 'Use evidence-backed wording, avoid personal attributes, and soften urgency.' : 'Ready for campaign QA.' });
});

module.exports = router;
