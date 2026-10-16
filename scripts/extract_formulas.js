const fs = require('fs');
const path = require('path');

const dash = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Dashboard-Dr5ZzWkg.js'), 'utf8');
const pos = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Pos-DwBFftDW.js'), 'utf8');
const inv = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_invoicePdf-qr1W4lBz.js'), 'utf8');

console.log('--- 1. INVOICE NUMBER FORMAT ---');
const invRegex = /invoice_no|invoiceNo|INV-|TOC-|ORD-/g;
const invMatches = [...pos.matchAll(new RegExp('.{0,50}(?:invoice_no|invoiceNo).{0,50}', 'g'))];
console.log('Invoice number matches sample:');
invMatches.slice(0, 10).forEach(m => console.log('MATCH:', m[0]));

console.log('\n--- 2. GST & TAX FORMULAS IN POS ---');
const gstMatches = [...pos.matchAll(new RegExp('.{0,50}(?:gst|tax|cgst|sgst).{0,50}', 'gi'))];
console.log('GST matches sample:');
gstMatches.slice(0, 10).forEach(m => console.log('MATCH:', m[0]));

console.log('\n--- 3. DISCOUNT & TOTAL FORMULAS IN POS ---');
const discountMatches = [...pos.matchAll(new RegExp('.{0,50}(?:discount|coupon|subtotal|total_amount|total).{0,50}', 'gi'))];
console.log('Discount matches sample:');
discountMatches.slice(0, 10).forEach(m => console.log('MATCH:', m[0]));

console.log('\n--- 4. METRICS IN DASHBOARD ---');
const metricMatches = [...dash.matchAll(new RegExp('.{0,60}(?:totalRevenue|totalExpenses|completedBills|avgRevenue|profitMargin).{0,60}', 'gi'))];
console.log('Dashboard metric matches:');
metricMatches.slice(0, 15).forEach(m => console.log('MATCH:', m[0]));
