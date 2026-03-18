require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');

const app = express();

// OpenRouter API Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const MAX_TOKENS = 1500;

app.use(express.json());

// CORS for production/Netlify
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

// System prompts per education level - Enforcing conciseness and LaTeX
const SYSTEM_PROMPTS = {
  primary: `You are an expert math AI. CRITICAL INSTRUCTIONS:\n1. DO NOT talk a lot. No conversational filler ("Here is the answer", "Let's solve this").\n2. Answer directly and concisely. \n3. Use simple vocabulary for ages 6-11, but keep it extremely brief.\n4. Use proper math symbols.\nRespond in the student's language.`,
  college: `You are an expert math AI for middle school (ages 11-15). CRITICAL INSTRUCTIONS:\n1. DO NOT talk a lot. Zero conversational filler. NEVER start with "Sure," "Here is," etc.\n2. Provide the direct mathematical solution step-by-step.\n3. Use real math symbols. Use LaTeX format: \`$$...$$\` for block equations and \`$...\$\` for inline math so the frontend renders it perfectly.\n4. Keep explanations extremely short and precise.\nRespond in the student's language.`,
  lycee: `You are a hyper-accurate, high-level math AI strictly for high school (Lycée) and university math. CRITICAL INSTRUCTIONS:\n1. ZERO FLUFF. DO NOT use conversational filler. Begin the math immediately.\n2. ALWAYS use real, accurate mathematical symbols. Use strict LaTeX formatting: \`$$...$$\` for block math, \`$...\$\` for inline math (e.g., integrals, limits, matrices).\n3. Provide rigorous, extremely concise step-by-step proofs and solutions.\n4. Do not talk unless explaining a critical theorem or step. Focus purely on accurate mathematics.\nRespond in the student's language.`
};

// ── Chat endpoint — streams AI responses via SSE ──
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
    const apiMessages = messages.slice(-10);
    if (apiMessages.length > 0 && apiMessages[0].role === 'user') {
      apiMessages[0].content = `${systemPrompt}\n\nUser Question:\n${apiMessages[0].content}`;
    } else if (apiMessages.length > 0) {
      apiMessages.unshift({ role: 'user', content: systemPrompt });
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'MathGenius'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch {}
      return res.status(response.status).json({ error: 'AI service error', status: response.status, details: errText });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of response.body) { res.write(chunk); }
    } catch (streamErr) {}

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Quiz generation endpoint ──
app.post('/api/quiz', async (req, res) => {
  if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'Server misconfigured: missing API key' });

  try {
    const { level = 'college', topic = 'general', language = 'fr', count = 5 } = req.body;
    const quizPrompt = `Generate exactly ${count} multiple-choice math quiz questions for ${level} level students about ${topic}. Format your response as a JSON array. Each question should have: - "question": the math question text - "options": array of 4 options (strings) - "correct": index of the correct option (0-3) - "explanation": brief explanation of the correct answer. Respond ONLY with valid JSON, no additional text. Language: ${language === 'fr' ? 'French' : language === 'en' ? 'English' : language === 'ar' ? 'Arabic' : 'Spanish'}.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'MathGenius'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: `You are a math quiz generator. Always respond with valid JSON only.\n\n${quizPrompt}` }],
        max_tokens: MAX_TOKENS,
        temperature: 0.8
      })
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Quiz generation failed' });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    let quiz;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      quiz = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch { quiz = []; }

    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', environment: 'netlify-functions' }));

// Export the serverless function handler
module.exports.handler = serverless(app);
