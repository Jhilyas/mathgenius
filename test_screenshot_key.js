const KEY = "694c6669f01947789faf6bf1bf2d612e.EqYcOWj_8RNsw5yrNywZAZD9";

async function testZhipu() {
  console.log(`\nTesting Zhipu...`);
  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ model: 'glm-5', messages: [{ role: 'user', content: 'What is 2+2?' }] })
    });
    console.log(`Zhipu Status: ${response.status}`);
    console.log(`Zhipu Body:`, (await response.text()).substring(0, 500));
  } catch(e) {}
}

async function testOllama() {
  console.log(`\nTesting Ollama Cloud...`);
  try {
    const response = await fetch("https://ollama.com/v1/chat/completions", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ model: 'glm-5', messages: [{ role: 'user', content: 'What is 2+2?' }] })
    });
    console.log(`Ollama Status: ${response.status}`);
    console.log(`Ollama Body:`, (await response.text()).substring(0, 500));
  } catch(e) {}
}

async function run() {
  await testZhipu();
  await testOllama();
}
run();
