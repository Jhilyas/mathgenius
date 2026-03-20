require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenRouter API Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Fallback chain: if a model is rate-limited (429) or not found (404), try the next
const CHAT_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'stepfun/step-3.5-flash:free',
  'google/gemma-3-12b-it:free'
];
const QUIZ_MODEL = 'google/gemini-2.5-flash';
const MAX_TOKENS = 1500;
const QUIZ_MAX_TOKENS = 3000;

// ── Middleware ──
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS for production
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.APP_URL
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

// System prompts per education level - Enforcing conciseness and LaTeX
const SYSTEM_PROMPTS = {
  primary: `You are an expert math AI. CRITICAL INSTRUCTIONS:
1. DO NOT talk a lot. No conversational filler ("Here is the answer", "Let's solve this").
2. Answer directly and concisely. 
3. Use simple vocabulary for ages 6-11, but keep it extremely brief.
4. Use proper math symbols.
Respond in the student's language.`,

  college: `You are an expert math AI for middle school (ages 11-15). CRITICAL INSTRUCTIONS:
1. DO NOT talk a lot. Zero conversational filler. NEVER start with "Sure," "Here is," etc.
2. Provide the direct mathematical solution step-by-step.
3. Use real math symbols. Use LaTeX format: \`$$...$$\` for block equations and \`$...\$\` for inline math so the frontend renders it perfectly.
4. Keep explanations extremely short and precise.
Respond in the student's language.`,

  lycee: `You are a hyper-accurate, high-level math AI strictly for high school (Lycée) and university math. CRITICAL INSTRUCTIONS:
1. ZERO FLUFF. DO NOT use conversational filler. Begin the math immediately.
2. ALWAYS use real, accurate mathematical symbols. Use strict LaTeX formatting: \`$$...$$\` for block math, \`$...\$\` for inline math (e.g., integrals, limits, matrices).
3. Provide rigorous, extremely concise step-by-step proofs and solutions.
4. Do not talk unless explaining a critical theorem or step. Focus purely on accurate mathematics.
Respond in the student's language.`
};

// ── Chat endpoint — streams AI responses via SSE with model fallback ──
app.post('/api/chat', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  try {
    const { messages, level = 'college' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const systemPrompt = SYSTEM_PROMPTS[level] || SYSTEM_PROMPTS.college;

    // Build API messages with system prompt prepended (don't mutate original)
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10)
    ];

    // Try each model in fallback chain
    let response = null;
    let usedModel = '';

    for (const model of CHAT_MODELS) {
      console.log('[Chat] Trying model:', model, 'level:', level);

      response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'MathGenius'
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          max_tokens: MAX_TOKENS,
          temperature: 0.7,
          stream: true
        })
      });

      if (response.ok) {
        usedModel = model;
        break; // Success — use this model
      }

      // If rate-limited (429) or model not found (404), try next model
      if (response.status === 429 || response.status === 404) {
        console.warn('[Chat] Model', model, 'error (' + response.status + '), trying next...');
        continue;
      }

      // Any other error — stop and return it
      let errText = '';
      try { errText = await response.text(); } catch {}
      console.error('[Chat] API error:', response.status, errText);
      return res.status(response.status).json({ 
        error: 'AI service error', 
        status: response.status,
        details: errText 
      });
    }

    if (!response || !response.ok) {
      console.error('[Chat] All models rate-limited');
      return res.status(429).json({ error: 'All AI models are currently busy. Please try again in a few seconds.' });
    }

    console.log('[Chat] Streaming from:', usedModel);

    // Stream SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    } catch (streamErr) {
      console.error('[Chat] Stream error:', streamErr.message);
    }

    res.end();

  } catch (error) {
    console.error('[Chat] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ── Quiz generation endpoint ──
app.post('/api/quiz', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  try {
    const { level = 'college', topic = 'general', language = 'fr', count = 5 } = req.body;

    const quizPrompt = `Generate exactly ${count} multiple-choice math quiz questions for ${level} level students about ${topic}.
Format your response as a JSON array. Each question should have:
- "question": the math question text
- "options": array of 4 options (strings)
- "correct": index of the correct option (0-3)
- "explanation": brief explanation of the correct answer

Respond ONLY with valid JSON, no additional text. Language: ${language === 'fr' ? 'French' : language === 'en' ? 'English' : language === 'ar' ? 'Arabic' : 'Spanish'}.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'MathGenius'
      },
      body: JSON.stringify({
        model: QUIZ_MODEL,
        messages: [
          { role: 'user', content: `You are a math quiz generator. Always respond with valid JSON only.\n\n${quizPrompt}` }
        ],
        max_tokens: QUIZ_MAX_TOKENS,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Quiz generation failed' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    let quiz;
    try {
      // Strip markdown code fences if present: ```json ... ```
      let cleaned = content.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      quiz = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      quiz = [];
    }

    res.json({ quiz });

  } catch (error) {
    console.error('[Quiz] Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Health check for hosting platforms ──
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ── SPA fallback — serve index.html for any unmatched route ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🧮 MathGenius is running!`);
  console.log(`  📚 Open http://localhost:${PORT}`);
  console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
