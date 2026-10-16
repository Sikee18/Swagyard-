const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Dashboard-Dr5ZzWkg.js'), 'utf8');

// Let's search for navigation tabs array
const navMatch = content.match(/navItems\s*=\s*\[.*?\]|tabs\s*=\s*\[.*?\]/s) || content.match(/\[\{id:.*?\}\]/s);
console.log('Nav match in Dashboard:');
// Let's find labels like "Billing", "Inventory", etc.
const labelMatches = content.match(/\{id:["'][^"']+["'],label:["'][^"']+["'][^}]*\}/g);
console.log('Tab items found:', labelMatches);

// Let's also check for all components or subcomponents in Dashboard
const componentMatches = content.match(/function\s+([A-Za-z0-9_]+)/g) || [];
console.log('Functions in Dashboard (sample):', componentMatches.slice(0, 30));
