export default async (req, context) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
  const MAX_TOKENS = 1500;

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

    const SYSTEM_PROMPTS = {
      primary: `You are an expert math AI. CRITICAL INSTRUCTIONS:\n1. DO NOT talk a lot. No conversational filler.\n2. Answer directly and concisely. \n3. Use simple vocabulary for ages 6-11, but keep it extremely brief.\n4. Use proper math symbols.\nRespond in the student's language.`,
      college: `You are an expert math AI for middle school (ages 11-15). CRITICAL INSTRUCTIONS:\n1. DO NOT talk a lot. Zero conversational filler. NEVER start with "Sure," "Here is," etc.\n2. Provide the direct mathematical solution step-by-step.\n3. Use real math symbols. Use LaTeX format: \`$$...$$\` for block equations and \`$...\$\` for inline math.\n4. Keep explanations extremely short and precise.\nRespond in the student's language.`,
      lycee: `You are a hyper-accurate, high-level math AI strictly for high school (Lycée) and university math. CRITICAL INSTRUCTIONS:\n1. ZERO FLUFF. DO NOT use conversational filler. Begin the math immediately.\n2. ALWAYS use real, accurate mathematical symbols. Use strict LaTeX formatting: \`$$...$$\` for block math, \`$...\$\` for inline math.\n3. Provide rigorous, extremely concise step-by-step proofs and solutions.\n4. Do not talk unless explaining a critical theorem or step.\nRespond in the student's language.`
    };

    const systemPrompt = SYSTEM_PROMPTS[level] || SYSTEM_PROMPTS.college;
    const apiMessages = messages.slice(-10);
    if (apiMessages.length > 0 && apiMessages[0].role === 'user') {
      apiMessages[0].content = `${systemPrompt}\n\nUser Question:\n${apiMessages[0].content}`;
    } else if (apiMessages.length > 0) {
      apiMessages.unshift({ role: 'user', content: systemPrompt });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      return new Response(await response.text(), { status: response.status });
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
