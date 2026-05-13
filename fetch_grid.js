const https = require('https');
https.get('https://poe.ninja/builds/poe2/character/Tuna_poe/TunaTunaTunaTunaTuna?type=depthsolo', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const fs = require('fs');
    fs.writeFileSync('poeninja.html', data);
    console.log('Saved to poeninja.html');
  });
});
