const fs = require('fs');
const path = require('path');

const pos = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Pos-DwBFftDW.js'), 'utf8');

// Search for cart state or item addition
console.log('Searching POS JS:');
const cartSnippet = pos.match(/cart\s*,\s*setCart/g) || pos.match(/items\s*,\s*setItems/g);
console.log('Cart state matches:', cartSnippet);

// Find how products are fetched and mapped
const productCardMatches = pos.match(/onClick:\s*\(\)\s*=>\s*\{[^}]*addItem[^}]*\}/g) || pos.match(/handleSelectProduct|addToCart|handleAddToCart/g);
console.log('Product handlers:', productCardMatches ? productCardMatches.slice(0, 10) : 'none');

// Find all occurrences of buttons or actions in POS
const posButtons = [...pos.matchAll(/>([A-Za-z0-9\s&+\-%/]+)<\/button>/g)].map(m => m[1].trim());
console.log('POS button text:', [...new Set(posButtons)]);
