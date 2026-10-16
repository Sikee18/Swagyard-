const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_index-DqBlaRbU.js'), 'utf8');

const matches = [...index.matchAll(/.{0,80}(?:AudioContext|createOscillator).{0,120}/g)];
matches.slice(0, 5).forEach(m => console.log('AUDIO MATCH:', m[0]));
