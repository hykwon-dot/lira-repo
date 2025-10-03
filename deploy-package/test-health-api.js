const https = require('https');

function testHealthAPI() {
  console.log('Testing deployment health API...');
  
  const options = {
    hostname: 'lira365.com',
    port: 443,
    path: '/api/health/deployment',
    method: 'GET',
    timeout: 10000
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error.message);
  });

  req.on('timeout', () => {
    console.error('Request timeout');
    req.destroy();
  });

  req.end();
}

testHealthAPI();