const fs = require('fs');
const path = require('path');

const files = ['assets_Pos-DwBFftDW.js', 'assets_Dashboard-Dr5ZzWkg.js', 'assets_index-DqBlaRbU.js'];

for (const file of files) {
  const filePath = path.join(__dirname, '..', 'reference_assets', file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const soundMatches = [...content.matchAll(/AudioContext|oscillator|sound|\.mp3|\.wav|alarm/gi)].map(m => m[0]);
  console.log(`Sound in ${file}:`, soundMatches.slice(0, 20));
}
