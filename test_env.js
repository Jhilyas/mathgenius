require('dotenv').config();
console.log('API KEY:', process.env.OPENROUTER_API_KEY ? 'EXISTS' : 'MISSING');
console.log('NODE_ENV:', process.env.NODE_ENV);
