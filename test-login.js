const https = require('https');

const data = JSON.stringify({
  email: "admin@whatsapptaskmanager.com",
  password: "admin"
});

const options = {
  hostname: 'whatapptashmanager-api.onrender.com',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let responseData = '';
  res.on('data', chunk => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${responseData}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
