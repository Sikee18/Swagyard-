const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Pos-DwBFftDW.js'), 'utf8');

// Find all labels, placeholders, buttons
const placeholders = content.match(/placeholder:\s*["']([^"']+)["']/g) || [];
console.log('POS Placeholders:', [...new Set(placeholders)]);

// Search for calculations, GST, discount logic
const mathMatches = content.match(/gst|discount|split|cash|card|upi|qr|round/gi) || [];
console.log('POS keywords count:', mathMatches.length);

// Search for customer fields
const customerMatches = content.match(/customer[A-Za-z0-9_]*|phone[A-Za-z0-9_]*/gi) || [];
console.log('Customer matches sample:', [...new Set(customerMatches)].slice(0, 20));
