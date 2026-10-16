const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

async function dismissAlarmIfPresent(page) {
  try {
    const silenceBtn = await page.$('button:has-text("Silence"), button:has-text("Acknowledge")');
    if (silenceBtn) {
      await silenceBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}
}

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Logging in...');
  await page.goto('https://one-clothing.vercel.app/admin-login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(2000);
  await dismissAlarmIfPresent(page);

  // 1. Analytics
  console.log('Auditing Analytics Dashboard...');
  const analyticsBtn = await page.$('aside button:has-text("Analytics"), nav button:has-text("Analytics")');
  if (analyticsBtn) await analyticsBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'pos-analytics-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'pos-analytics-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  const subtabs = ['Revenue', 'Product & Category', 'Inventory', 'Customer', 'Billing'];
  for (const st of subtabs) {
    try {
      const btn = await page.$(`button:has-text("${st}")`);
      if (btn) {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(600);
        const slug = st.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `analytics-subtab-${slug}.png`) });
      }
    } catch (e) {}
  }

  // 2. Coupons
  console.log('Auditing Coupons...');
  const couponBtn = await page.$('aside button:has-text("Coupons"), nav button:has-text("Coupons")');
  if (couponBtn) await couponBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'coupons-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'coupons-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 3. WhatsApp Center
  console.log('Auditing WhatsApp Center...');
  try {
    await page.goto('https://one-clothing.vercel.app/whatsapp-center', { waitUntil: 'networkidle', timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'whatsapp-center-desktop.png') });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'whatsapp-center-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
  } catch (e) {
    console.log('WhatsApp center err:', e.message);
  }

  // 4. Order History action & Invoice Preview
  console.log('Auditing Order History table actions...');
  await page.goto('https://one-clothing.vercel.app/dashboard?tab=order_history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dismissAlarmIfPresent(page);

  // Inspect what buttons exist in the table rows
  const rowButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('tbody tr button, tbody tr a')).map(el => ({
      text: el.innerText.trim(),
      title: el.getAttribute('title') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      className: el.className
    }));
  });
  console.log('Row buttons in Order History:', JSON.stringify(rowButtons, null, 2));

  // Click the first button in tbody
  try {
    const firstAction = await page.$('tbody tr button');
    if (firstAction) {
      await firstAction.click({ timeout: 3000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'order-history-action-modal.png') });
    }
  } catch (e) {
    console.log('Row action click err:', e.message);
  }

  console.log('Remaining audit views completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Err:', err);
  process.exit(1);
});
