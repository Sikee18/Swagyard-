const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'index.css'), 'utf8');

// Find :root variables
const rootMatches = css.match(/:root\s*\{[^}]*\}/g) || [];
console.log('Root CSS variables:');
rootMatches.forEach(m => console.log(m));

// Find custom font-face or color variables
const fontFaces = css.match(/@font-face\s*\{[^}]*\}/g) || [];
console.log('Font faces count:', fontFaces.length);

// Find print styles
const printMedia = css.match(/@media\s+print\s*\{[^}]*\}/g) || [];
console.log('Print media count:', printMedia.length);
printMedia.forEach(m => console.log(m.slice(0, 300)));
