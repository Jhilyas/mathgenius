const ZHIPU_API_KEY = "d639a09e0f1e4178bd78b721613caadf.snzm6NGMf5ChWsk4BsjT4zpw";
const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}...`);
  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'What is 2+2?' }]
      })
    });

    const status = response.status;
    const body = await response.text();
    console.log(`Status: ${status}`);
    console.log(`Raw Body:`, body);
  } catch (err) {
    console.error(`Fetch error for ${modelName}:`, err);
  }
}

async function run() {
  await testModel('glm-4');
  await testModel('glm-4-flash');
  await testModel('glm-5');
  await testModel('glm-4-plus');
}

run();
