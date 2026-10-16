const fs = require('fs');
const path = require('path');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'extracted_design_tokens.json'), 'utf8'));

for (const [route, data] of Object.entries(tokens)) {
  console.log(`\n=== ROUTE: ${route} ===`);
  console.log('Loaded Fonts count:', data.loadedFonts.length);
  console.log('Font Families:', data.fontFamilies);
  console.log('Font Sizes:', data.fontSizes.slice(0, 10));
  console.log('Font Weights:', data.fontWeights);
  console.log('Border Radii:', data.borderRadii.filter(r => r !== '0px'));
  console.log('Shadows:', data.shadows.filter(s => s !== 'none'));
}
