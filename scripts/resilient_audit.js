const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function getDesignTokens(page) {
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

async function getPageCopy(page) {
  return await page.evaluate(() => {
    return {
      title: document.title,
      headings: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({ tag: h.tagName, text: h.innerText.trim() })),
      buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean),
      inputs: [...document.querySelectorAll('input, textarea, select')].map(i => ({
        type: i.type || i.tagName.toLowerCase(),
        placeholder: i.placeholder || '',
        name: i.name || '',
        id: i.id || '',
        value: i.value || ''
      })),
      labels: [...document.querySelectorAll('label')].map(l => l.innerText.trim()).filter(Boolean),
      tableHeaders: [...document.querySelectorAll('th')].map(th => th.innerText.trim()).filter(Boolean)
    };
  });
}

async function safeClick(page, selector, timeout = 3000) {
  try {
    const el = await page.waitForSelector(selector, { timeout, state: 'visible' });
    if (el) {
      await el.click();
      return true;
    }
  } catch (e) {
    // console.log(`safeClick skipped: ${selector} (${e.message})`);
  }
  return false;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const auditData = {
    tokensByPage: {},
    copyByPage: {},
    interactions: []
  };

  console.log('Logging in...');
  await page.goto('https://one-clothing.vercel.app/admin-login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(2000);

  // Dismiss alarm if present
  const silenceBtn = await page.$('button:has-text("Silence"), button:has-text("Acknowledge")');
  if (silenceBtn) {
    await silenceBtn.click();
    await page.waitForTimeout(1000);
  }

  const tabs = [
    { id: 'inventory', tabParam: 'inventory', name: 'Inventory & Barcodes' },
    { id: 'advance_orders', tabParam: 'advance_orders', name: 'Advance Orders' },
    { id: 'birthdays', tabParam: 'birthdays', name: 'Birthdays' },
    { id: 'expenses', tabParam: 'expenses', name: 'Expenses' },
    { id: 'order_history', tabParam: 'order_history', name: 'Order History' },
    { id: 'pos_analytics', tabParam: 'pos_analytics', name: 'Analytics Dashboard' },
    { id: 'coupons', tabParam: 'coupons', name: 'Coupons' }
  ];

  for (const t of tabs) {
    console.log(`Auditing: ${t.name}...`);
    await page.goto(`https://one-clothing.vercel.app/dashboard?tab=${t.tabParam}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Desktop screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${t.id}-desktop.png`) });
    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${t.id}-mobile.png`) });
    await page.setViewportSize({ width: 1280, height: 800 });

    auditData.tokensByPage[t.id] = await getDesignTokens(page);
    auditData.copyByPage[t.id] = await getPageCopy(page);

    if (t.id === 'inventory') {
      // Test search
      const searchBox = await page.$('input[placeholder*="Search"]');
      if (searchBox) {
        await searchBox.fill('Pant');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-search-results.png') });
        await searchBox.fill('');
      }

      // Add Product button
      const addBtn = await page.$('button:has-text("Add Product"), button:has-text("New Product"), button:has-text("Add Item")');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-add-product-modal.png') });
        auditData.copyByPage['inventory-add-modal'] = await getPageCopy(page);
        await safeClick(page, 'button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
      }

      // Barcode button
      const barcodeBtn = await page.$('button:has-text("Barcode"), button:has-text("Print Barcode"), button:has-text("Barcode Registry")');
      if (barcodeBtn) {
        await barcodeBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-barcode-modal.png') });
        auditData.copyByPage['inventory-barcode-modal'] = await getPageCopy(page);
        await safeClick(page, 'button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
      }
    }

    if (t.id === 'advance_orders') {
      const addAdv = await page.$('button:has-text("New Advance Order"), button:has-text("Create Advance Order"), button:has-text("+ Advance Order")');
      if (addAdv) {
        await addAdv.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'advance-orders-new-modal.png') });
        auditData.copyByPage['advance-orders-modal'] = await getPageCopy(page);
        await safeClick(page, 'button:has-text("Cancel"), button:has-text("Close")');
      }
    }

    if (t.id === 'expenses') {
      const addExp = await page.$('button:has-text("Add Expense"), button:has-text("New Expense")');
      if (addExp) {
        await addExp.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expenses-add-modal.png') });
        auditData.copyByPage['expenses-modal'] = await getPageCopy(page);
        await safeClick(page, 'button:has-text("Cancel"), button:has-text("Close")');
      }
    }

    if (t.id === 'order_history') {
      // View first invoice details if available
      const viewBtn = await page.$('button:has-text("View"), button:has-text("Print"), [title*="View"], [title*="Invoice"]');
      if (viewBtn) {
        await viewBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'order-history-invoice-preview.png') });
        auditData.copyByPage['order-history-invoice-preview'] = await getPageCopy(page);
        await safeClick(page, 'button:has-text("Close"), [aria-label="Close"]');
      }
    }

    if (t.id === 'pos_analytics') {
      const subtabs = ['Revenue', 'Product & Category', 'Inventory', 'Customer', 'Billing'];
      for (const st of subtabs) {
        const clicked = await safeClick(page, `button:has-text("${st}")`);
        if (clicked) {
          await page.waitForTimeout(600);
          const slug = st.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `analytics-subtab-${slug}.png`) });
        }
      }
    }

    if (t.id === 'coupons') {
      const addCpn = await page.$('button:has-text("Create Coupon"), button:has-text("Add Coupon")');
      if (addCpn) {
        await addCpn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'coupons-create-modal.png') });
        auditData.copyByPage['coupons-modal'] = await getPageCopy(page);
        await safeClick(page, 'button:has-text("Cancel"), button:has-text("Close")');
      }
    }
  }

  // Standalone routes
  const standalone = [
    { url: 'https://one-clothing.vercel.app/whatsapp-center', name: 'whatsapp-center' },
    { url: 'https://one-clothing.vercel.app/pos-analytics', name: 'standalone-pos-analytics' },
    { url: 'https://one-clothing.vercel.app/advance-orders', name: 'standalone-advance-orders' },
    { url: 'https://one-clothing.vercel.app/expenses', name: 'standalone-expenses' }
  ];

  for (const s of standalone) {
    try {
      console.log(`Checking standalone: ${s.name}...`);
      await page.goto(s.url, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${s.name}-desktop.png`) });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${s.name}-mobile.png`) });
      await page.setViewportSize({ width: 1280, height: 800 });
      auditData.copyByPage[s.name] = await getPageCopy(page);
    } catch (e) {
      console.log(`Standalone route ${s.name} error: ${e.message}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'tab_audit_data.json'), JSON.stringify(auditData, null, 2));
  console.log('All tab audits completed!');
  await browser.close();
}

run().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
