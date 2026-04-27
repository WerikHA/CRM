const http = require('https');
http.get('https://localhost:3000/api/health/supabase', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
