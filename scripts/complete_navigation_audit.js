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

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const auditData = {
    tokensByPage: {},
    copyByPage: {},
    interactions: []
  };

  console.log('1. Logging in...');
  await page.goto('https://one-clothing.vercel.app/admin-login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(2500);
  await dismissAlarmIfPresent(page);

  const tabs = [
    { label: 'Billing Panel', slug: 'billing' },
    { label: 'Inventory & Barcodes', slug: 'inventory' },
    { label: 'Advance Orders', slug: 'advance-orders' },
    { label: 'Birthdays', slug: 'birthdays' },
    { label: 'Expenses', slug: 'expenses' },
    { label: 'Order History', slug: 'order-history' },
    { label: 'Analytics Dashboard', slug: 'pos-analytics' },
    { label: 'Coupons', slug: 'coupons' }
  ];

  for (const t of tabs) {
    console.log(`2. Clicking sidebar tab: ${t.label}...`);
    await dismissAlarmIfPresent(page);
    const navBtn = await page.$(`aside button:has-text("${t.label}"), nav button:has-text("${t.label}")`);
    if (navBtn) {
      await navBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log(`Could not find sidebar button for ${t.label}, navigating via URL...`);
      await page.goto(`https://one-clothing.vercel.app/dashboard?tab=${t.slug.replace('-', '_')}`);
      await page.waitForTimeout(1500);
      await dismissAlarmIfPresent(page);
    }

    // Capture desktop
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${t.slug}-desktop.png`) });

    // Capture mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${t.slug}-mobile.png`) });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    auditData.tokensByPage[t.slug] = await getDesignTokens(page);
    auditData.copyByPage[t.slug] = await getPageCopy(page);

    // Specific modal interactions
    if (t.slug === 'inventory') {
      const addBtn = await page.$('button:has-text("Add Product"), button:has-text("New Product"), button:has-text("+ Add")');
      if (addBtn) {
        console.log('Testing Add Product modal in inventory...');
        await addBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-add-product-modal.png') });
        auditData.copyByPage['inventory-add-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
        if (cancelBtn) await cancelBtn.click();
        await page.waitForTimeout(500);
      }

      const barcodeBtn = await page.$('button:has-text("Barcode"), button:has-text("Print Barcode")');
      if (barcodeBtn) {
        console.log('Testing Barcode modal in inventory...');
        await barcodeBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-barcode-modal.png') });
        auditData.copyByPage['inventory-barcode-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
        if (cancelBtn) await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    if (t.slug === 'advance-orders') {
      const addAdv = await page.$('button:has-text("New Advance Order"), button:has-text("Add Order"), button:has-text("+")');
      if (addAdv) {
        console.log('Testing New Advance Order modal...');
        await addAdv.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'advance-orders-new-modal.png') });
        auditData.copyByPage['advance-orders-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close")');
        if (cancelBtn) await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    if (t.slug === 'expenses') {
      const addExp = await page.$('button:has-text("Add Expense"), button:has-text("New Expense")');
      if (addExp) {
        console.log('Testing Add Expense modal...');
        await addExp.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expenses-add-modal.png') });
        auditData.copyByPage['expenses-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close")');
        if (cancelBtn) await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    if (t.slug === 'coupons') {
      const addCpn = await page.$('button:has-text("Create Coupon"), button:has-text("Add Coupon")');
      if (addCpn) {
        console.log('Testing Create Coupon modal...');
        await addCpn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'coupons-create-modal.png') });
        auditData.copyByPage['coupons-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close")');
        if (cancelBtn) await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    if (t.slug === 'order-history') {
      const viewBtn = await page.$('button:has-text("View"), button:has-text("Print"), [title*="Invoice"], [title*="Receipt"]');
      if (viewBtn) {
        console.log('Testing Order History View Invoice...');
        await viewBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'order-history-invoice-preview.png') });
        auditData.copyByPage['order-history-modal'] = await getPageCopy(page);
        const closeBtn = await page.$('button:has-text("Close"), [aria-label="Close"]');
        if (closeBtn) await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    if (t.slug === 'pos-analytics') {
      const subtabs = ['Revenue', 'Product & Category', 'Inventory', 'Customer', 'Billing'];
      for (const st of subtabs) {
        try {
          const btn = await page.$(`button:has-text("${st}")`);
          if (btn) {
            await btn.click();
            await page.waitForTimeout(600);
            const slug = st.toLowerCase().replace(/[^a-z0-9]/g, '-');
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `analytics-subtab-${slug}.png`) });
          }
        } catch (e) {}
      }
    }
  }

  // Standalone routes
  const standalone = [
    { url: 'https://one-clothing.vercel.app/whatsapp-center', name: 'whatsapp-center' }
  ];

  for (const s of standalone) {
    try {
      console.log(`Checking standalone: ${s.name}...`);
      await page.goto(s.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${s.name}-desktop.png`) });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${s.name}-mobile.png`) });
      await page.setViewportSize({ width: 1280, height: 800 });
      auditData.copyByPage[s.name] = await getPageCopy(page);
      auditData.tokensByPage[s.name] = await getDesignTokens(page);
    } catch (e) {
      console.log(`Standalone route error: ${e.message}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'master_audit_results.json'), JSON.stringify(auditData, null, 2));
  console.log('Complete navigation audit successfully finished!');
  await browser.close();
}

run().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
