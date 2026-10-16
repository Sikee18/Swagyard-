const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(path.join(__dirname, '..', 'reference_assets'));

console.log('Searching for routes and paths...');

for (const file of files) {
  if (!file.endsWith('.js')) continue;
  const content = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', file), 'utf8');

  // Find strings like path: "/...", path: "..."
  const routeMatches = content.match(/path:\s*["'][^"']+["']/g) || [];
  if (routeMatches.length > 0) {
    console.log(`\nFile ${file} has routes:`);
    console.log([...new Set(routeMatches)]);
  }

  // Find tab names or navigation names
  const tabMatches = content.match(/tab===["'][^"']+["']|tab\s*===\s*["'][^"']+["']|\?tab=[a-zA-Z0-9_-]+/g) || [];
  if (tabMatches.length > 0) {
    console.log(`\nFile ${file} has tabs:`);
    console.log([...new Set(tabMatches)]);
  }
}
