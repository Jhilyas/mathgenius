const key = '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';
fetch('https://openrouter.ai/api/v1/auth/key', {
  headers: { 'Authorization': `Bearer ${key}` }
})
.then(res => res.json())
.then(data => console.log('Auth check:', data))
.catch(err => console.error(err));
