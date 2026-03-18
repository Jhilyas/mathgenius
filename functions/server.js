require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');

const app = express();

// OpenRouter API Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-3-27b-it';
const MAX_TOKENS = 1024;

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

// System prompts per education level
const SYSTEM_PROMPTS = {
  primary: `You are MathGenius, a friendly and patient math tutor for primary school students (ages 6-11). Explain concepts simply using everyday examples. Use encouraging language. Always show step-by-step solutions. Use simple vocabulary. When appropriate, suggest visual methods (drawing, counting objects). Respond in the same language as the student's message.`,
  college: `You are MathGenius, an expert math tutor for college/middle school students (Collège, ages 11-15). Cover topics: algebra basics, geometry, fractions, percentages, basic statistics, proportionality. Provide clear step-by-step solutions with explanations of each step. Use proper mathematical notation. Encourage critical thinking. Respond in the same language as the student's message.`,
  lycee: `You are MathGenius, an advanced math tutor for high school students (Lycée, ages 15-18). Cover topics: advanced algebra, trigonometry, calculus, complex numbers, probability, sequences, limits, derivatives, integrals. Provide rigorous step-by-step proofs and solutions. Use formal mathematical notation and terminology. Explain underlying concepts and theorems. Provide multiple solution approaches when possible. Respond in the same language as the student's message.`
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
