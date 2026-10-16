const fs = require('fs');
const path = require('path');

const files = ['assets_Pos-DwBFftDW.js', 'assets_Dashboard-Dr5ZzWkg.js', 'assets_supabase-BEdK-fR0.js'];

for (const file of files) {
  const filePath = path.join(__dirname, '..', 'reference_assets', file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const rpcMatches = [...content.matchAll(/\.rpc\(["']([^"']+)["']\s*,\s*(\{[^}]*\})/g)];
  console.log(`\nRPC in ${file}:`);
  rpcMatches.forEach(m => {
    console.log(`RPC Name: ${m[1]}`);
    console.log(`Params: ${m[2].slice(0, 200)}`);
  });

  // Also match any .from("...") table names
  const tableMatches = [...content.matchAll(/\.from\(["']([^"']+)["']\)/g)].map(m => m[1]);
  console.log(`Tables accessed in ${file}:`, [...new Set(tableMatches)]);
}
