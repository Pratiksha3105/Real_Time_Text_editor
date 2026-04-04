/**
 * AI Writing Assistant API Route
 * POST /api/ai/assist
 * 
 * Uses Anthropic's Claude API to provide writing suggestions.
 * Streams the response for real-time display.
 */

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 10000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  // If no Anthropic key, return a mock response for demo purposes
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 800)); // Simulate latency
    const mockResponses = {
      'Improve': 'This text has been enhanced for clarity, flow, and impact. The revised version maintains the original meaning while significantly improving readability.',
      'Summarize': 'A concise summary: The provided text covers key concepts related to the topic at hand, presenting information in a structured manner.',
      'Rephrase': 'Here is an alternative way to express the same idea, using different vocabulary and sentence structure while preserving the original meaning.',
      'Expand': 'Building on this concept: The original text touches on important points. To elaborate further, we can explore the implications, provide concrete examples, and examine the broader context.',
      'concise': 'Condensed version retaining all key points with improved brevity.',
      'Formal': 'This document presents a formal analysis of the subject matter, adhering to professional standards of written communication.',
      'Friendly': 'Hey there! Let me share this in a way that is warm and easy to connect with — because great ideas deserve to be understood by everyone!',
      'grammar': prompt.replace(/[^a-zA-Z0-9\s.,!?;:]/g, '').trim() || 'Grammar and spelling have been corrected throughout the text.',
    };

    const key = Object.keys(mockResponses).find((k) => prompt.includes(k)) || 'Improve';
    return res.status(200).json({ result: mockResponses[key] });
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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || '';
    return res.status(200).json({ result });

  } catch (err) {
    console.error('AI assist error:', err.message);
    return res.status(500).json({ error: 'AI service unavailable. Check ANTHROPIC_API_KEY.' });
  }
}
