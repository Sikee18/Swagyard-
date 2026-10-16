const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_AdminLogin-XxZ9FpgX.js'), 'utf8');

console.log('AdminLogin code length:', content.length);
// Find all strings in AdminLogin
const strings = [...content.matchAll(/"([^"\\]{3,80})"/g)].map(m => m[1]);
console.log('Sample strings in AdminLogin (60):');
console.log(strings.slice(0, 60));

// Find validation logic or credentials logic
const loginLogic = content.match(/signInWithPassword|sessionStorage|localStorage|admin/gi) || [];
console.log('Login logic keywords count:', loginLogic.length);
console.log('Keywords sample:', loginLogic.slice(0, 20));
