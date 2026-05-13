const fs = require('fs');
const html = fs.readFileSync('poeninja.html', 'utf8');
const imgs = html.match(/<img[^>]+src="[^"]+"[^>]*>/g) || [];
console.log(imgs.slice(0, 30).map(i => i.match(/src="([^"]+)"/)[1]).join('\n'));
