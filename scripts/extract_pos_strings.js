const fs = require('fs');
const path = require('path');

const pos = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Pos-DwBFftDW.js'), 'utf8');

// Find all string literals longer than 3 characters
const strings = [...pos.matchAll(/"([^"\\]{4,80})"/g)].map(m => m[1]);
console.log('Sample string literals in POS (100):');
console.log(strings.slice(0, 100));

// Filter strings that look like UI text (contain spaces or capital letters)
const uiTexts = strings.filter(s => s.includes(' ') && !s.includes('http') && !s.startsWith('bg-') && !s.startsWith('text-'));
console.log('\nUI Texts sample (100):');
console.log([...new Set(uiTexts)].slice(0, 100));
