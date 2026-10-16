const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_invoicePdf-qr1W4lBz.js'), 'utf8');

// Search for pdf strings and layout
const strings = [...content.matchAll(/"([^"\\]{3,100})"/g)].map(m => m[1]);
console.log('Sample strings in invoicePdf (80):');
console.log(strings.slice(0, 80));

// Search for jspdf calls or styles
const pdfCalls = content.match(/fontSize|setFont|text\(|rect\(|line\(|addImage/g) || [];
console.log('PDF layout calls:', [...new Set(pdfCalls)]);
