const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_index-DqBlaRbU.js'), 'utf8');

// Search for login: async ( or login(
const loginMatch = [...index.matchAll(/login\s*:\s*async\s*\([^)]*\)\s*=>\s*\{[^}]{1,500}\}/g)];
console.log('Login function matches:');
loginMatch.forEach(m => console.log(m[0]));

// Search for sessionStorage key 'the-one-admin-session'
const sessionMatch = [...index.matchAll(/.{0,50}the-one-admin-session.{0,50}/g)];
console.log('Session matches:');
sessionMatch.forEach(m => console.log(m[0]));
