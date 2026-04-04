/**
 * AI Routes - /api/ai
 * Server-side AI endpoint (alternative to Next.js API route)
 * For deployments where the backend handles AI requests directly.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Strict rate limit for AI endpoint: 20 requests per minute per user
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many AI requests. Please wait a minute.' },
});

// POST /api/ai/assist
router.post('/assist', protect, aiLimiter, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 10000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Demo mode: return mock response
    await new Promise((r) => setTimeout(r, 600));
    return res.json({
      result: `[AI Demo Mode] To enable AI features, add ANTHROPIC_API_KEY to backend .env.\n\nYour text has been "improved" (mock). Get a real key at console.anthropic.com.`,
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || '';
    res.json({ result });
  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ error: 'AI service error: ' + err.message });
  }
});

module.exports = router;
