
const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:3000/api/health');
  console.log('Health:', await res.json());
  
  // This will fail because no auth
  const resSync = await fetch('http://localhost:3000/api/sync');
  console.log('Sync content type:', resSync.headers.get('content-type'));
  console.log('Sync status:', resSync.status);
}

test();
