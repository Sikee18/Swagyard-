const fs = require('fs');
const path = require('path');

const net = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'initial_network.json')));
const jsRequests = net.filter(r => r.url.endsWith('.js') || r.url.includes('/_next/static/'));
console.log('JS files loaded:');
jsRequests.forEach(r => console.log(r.url));
