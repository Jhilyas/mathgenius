// Netlify Functions v2 config
export const config = {
  path: "/api/chat"
};

// Fallback chain: if a model is rate-limited (429) or not found (404), try the next
const CHAT_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'stepfun/step-3.5-flash:free',
  'google/gemma-3-12b-it:free'
];
const MAX_TOKENS = 1500;

const SYSTEM_PROMPTS = {
  primary: `You are an expert math AI. CRITICAL INSTRUCTIONS:\n1. DO NOT talk a lot. No conversational filler.\n2. Answer directly and concisely. \n3. Use simple vocabulary for ages 6-11, but keep it extremely brief.\n4. Use proper math symbols.\nRespond in the student's language.`,
  college: `You are an expert math AI for middle school (ages 11-15). CRITICAL INSTRUCTIONS:\n1. DO NOT talk a lot. Zero conversational filler. NEVER start with "Sure," "Here is," etc.\n2. Provide the direct mathematical solution step-by-step.\n3. Use real math symbols. Use LaTeX format: \`$$...$$\` for block equations and \`$...\$\` for inline math.\n4. Keep explanations extremely short and precise.\nRespond in the student's language.`,
  lycee: `You are a hyper-accurate, high-level math AI strictly for high school (Lycée) and university math. CRITICAL INSTRUCTIONS:\n1. ZERO FLUFF. DO NOT use conversational filler. Begin the math immediately.\n2. ALWAYS use real, accurate mathematical symbols. Use strict LaTeX formatting: \`$$...$$\` for block math, \`$...\$\` for inline math.\n3. Provide rigorous, extremely concise step-by-step proofs and solutions.\n4. Do not talk unless explaining a critical theorem or step.\nRespond in the student's language.`
};

export default async (req, context) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { messages, level = 'college' } = body;

    const systemPrompt = SYSTEM_PROMPTS[level] || SYSTEM_PROMPTS.college;
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10)
    ];

    // Try each model in fallback chain
    let response = null;

    for (const model of CHAT_MODELS) {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

      if (response.ok) break;
      if (response.status === 429 || response.status === 404) continue; // rate-limited or not found, try next

      // Other error — return it
      return new Response(await response.text(), { status: response.status });
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: 'All AI models are currently busy. Please retry.' }), { status: 429 });
    }

    // Return the stream directly to Netlify to pipe to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
