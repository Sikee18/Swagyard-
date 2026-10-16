const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'reference_assets', 'assets_Dashboard-Dr5ZzWkg.js'), 'utf8');

// Find all occurrences of label: or name: or tab navigation
const matches = [...content.matchAll(/tab:\s*["']([^"']+)["']|activeTab\s*===\s*["']([^"']+)["']|setActiveTab\(["']([^"']+)["']\)|tab\s*===\s*["']([^"']+)["']/g)];
const tabs = new Set();
matches.forEach(m => {
  for (let i = 1; i < m.length; i++) {
    if (m[i]) tabs.add(m[i]);
  }
});
console.log('All tabs identified:', [...tabs]);

// Let's also search for buttons or nav items with labels
const navLabels = content.match(/label:\s*["']([^"']+)["']/g);
console.log('Labels found:', navLabels ? [...new Set(navLabels)] : []);
