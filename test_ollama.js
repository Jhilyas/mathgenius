const API_KEY = "d639a09e0f1e4178bd78b721613caadf.snzm6NGMf5ChWsk4BsjT4zpw";

async function testEndpoint(url, payload) {
  console.log(`\nTesting endpoint: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    console.log(`Status: ${response.status}`);
    console.log(`Raw Body:`, (await response.text()).substring(0, 500));
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  // Test OpenAI compatible endpoint
  await testEndpoint('https://ollama.com/v1/chat/completions', {
    model: 'glm-5',
    messages: [{ role: 'user', content: 'What is 2+2?' }]
  });

  // Test native Ollama endpoint
  await testEndpoint('https://ollama.com/api/chat', {
    model: 'glm-5',
    messages: [{ role: 'user', content: 'What is 2+2?' }]
  });
}
run();
