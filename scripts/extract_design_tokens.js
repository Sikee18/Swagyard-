const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function dismissAlarmIfPresent(page) {
  try {
    const silenceBtn = await page.$('button:has-text("Silence"), button:has-text("Acknowledge")');
    if (silenceBtn) {
      await silenceBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}
}

async function extractTokens(page) {
  return await page.evaluate(() => {
    const q = s => [...document.querySelectorAll(s)];
    const u = f => [...new Set(q('body, body *').map(f))];
    return {
      url: location.href,
      loadedFonts: [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.style),
      fontFamilies: u(e => getComputedStyle(e).fontFamily),
      fontSizes: u(e => getComputedStyle(e).fontSize),
      fontWeights: u(e => getComputedStyle(e).fontWeight),
      lineHeights: u(e => getComputedStyle(e).lineHeight),
      textColors: u(e => getComputedStyle(e).color),
      backgrounds: u(e => getComputedStyle(e).backgroundColor),
      borderRadii: u(e => getComputedStyle(e).borderRadius),
      shadows: u(e => getComputedStyle(e).boxShadow)
    };
  });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const allTokens = {};

  // 1. Login Page
  console.log('Extracting tokens from /admin-login...');
  await page.goto('https://one-clothing.vercel.app/admin-login', { waitUntil: 'networkidle' });
  allTokens['/admin-login'] = await extractTokens(page);

  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(2000);
  await dismissAlarmIfPresent(page);

  // 2. Dashboard / POS
  console.log('Extracting tokens from /dashboard (POS)...');
  allTokens['/dashboard'] = await extractTokens(page);

  // 3. Tabs
  const tabs = [
    { name: 'inventory', label: 'Inventory & Barcodes' },
    { name: 'advance_orders', label: 'Advance Orders' },
    { name: 'birthdays', label: 'Birthdays' },
    { name: 'expenses', label: 'Expenses' },
    { name: 'order_history', label: 'Order History' },
    { name: 'pos_analytics', label: 'Analytics Dashboard' },
    { name: 'coupons', label: 'Coupons' }
  ];

  for (const t of tabs) {
    console.log(`Extracting tokens from tab: ${t.label}...`);
    const btn = await page.$(`aside button:has-text("${t.label}"), nav button:has-text("${t.label}")`);
    if (btn) await btn.click();
    await page.waitForTimeout(1000);
    allTokens[`/dashboard?tab=${t.name}`] = await extractTokens(page);
  }

  // 4. WhatsApp Center
  console.log('Extracting tokens from /whatsapp-center...');
  try {
    await page.goto('https://one-clothing.vercel.app/whatsapp-center', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    allTokens['/whatsapp-center'] = await extractTokens(page);
  } catch (e) {}

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'extracted_design_tokens.json'), JSON.stringify(allTokens, null, 2));
  console.log('Tokens successfully saved to docs/extracted_design_tokens.json');
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
