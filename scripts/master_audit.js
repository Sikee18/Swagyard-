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
    const copy = {
      title: document.title,
      headings: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({ tag: h.tagName, text: h.innerText.trim() })),
      buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean),
      inputs: [...document.querySelectorAll('input, textarea, select')].map(i => ({
        type: i.type || i.tagName.toLowerCase(),
        placeholder: i.placeholder || '',
        name: i.name || '',
        id: i.id || '',
        ariaLabel: i.getAttribute('aria-label') || '',
        value: i.value || ''
      })),
      labels: [...document.querySelectorAll('label')].map(l => l.innerText.trim()).filter(Boolean),
      tableHeaders: [...document.querySelectorAll('th')].map(th => th.innerText.trim()).filter(Boolean),
      badges: [...document.querySelectorAll('.badge, [class*="badge"], [class*="rounded-full"]')].map(el => el.innerText.trim()).filter(Boolean)
    };
    return copy;
  });
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
    networkLogs: [],
    interactions: []
  };

  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    const ct = res.headers()['content-type'] || '';
    let body = null;
    if (ct.includes('application/json') || url.includes('/rest/v1/')) {
      try { body = await res.text(); } catch (e) {}
    }
    auditData.networkLogs.push({ url, status, method: res.request().method(), body: body ? body.slice(0, 2000) : null });
  });

  console.log('1. Navigating to login...');
  await page.goto('https://one-clothing.vercel.app/admin-login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-desktop.png') });
  auditData.tokensByPage['login'] = await getDesignTokens(page);
  auditData.copyByPage['login'] = await getPageCopy(page);

  console.log('2. Submitting login credentials...');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check alarm modal
  const silenceBtn = await page.$('button:has-text("Silence"), button:has-text("Acknowledge")');
  if (silenceBtn) {
    console.log('Alarm modal detected. Capturing screenshot & dismissing...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-low-stock-modal.png') });
    await silenceBtn.click();
    await page.waitForTimeout(1000);
  }

  // --- BILLING / POS ---
  console.log('3. Analyzing Billing / POS...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'billing-empty-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'billing-empty-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  auditData.tokensByPage['billing'] = await getDesignTokens(page);
  auditData.copyByPage['billing'] = await getPageCopy(page);

  // Search product
  console.log('3A. Testing POS product search...');
  const searchInput = await page.$('input[placeholder*="Search by product name"]');
  if (searchInput) {
    await searchInput.fill('Pant');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'billing-search-results.png') });

    // Click first product / variant
    const productCard = await page.$('.cursor-pointer, button:has-text("Pant")');
    if (productCard) {
      await productCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'billing-cart-item-added.png') });
    }
  }

  // Test discount input in cart
  console.log('3B. Testing POS discount & customer fields...');
  const discountInput = await page.$('input[placeholder*="0.00"], input[placeholder*="0"]');
  const custNameInput = await page.$('input[placeholder*="Enter name"]');
  const custPhoneInput = await page.$('input[placeholder*="Enter WhatsApp number"]');

  if (custNameInput) await custNameInput.fill('ZZTEST-Customer');
  if (custPhoneInput) await custPhoneInput.fill('9999999999');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'billing-customer-details.png') });

  // Test payment buttons
  console.log('3C. Testing Payment modes...');
  const cashBtn = await page.$('button:has-text("Cash")');
  const qrBtn = await page.$('button:has-text("QR"), button:has-text("UPI")');
  const cardBtn = await page.$('button:has-text("Card")');
  const splitBtn = await page.$('button:has-text("Split")');
  if (splitBtn) {
    await splitBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'billing-payment-split-selected.png') });
  }

  // Clear cart / reset to avoid placing real orders
  const clearCartBtn = await page.$('button:has-text("Clear"), button:has-text("Reset"), button[title*="Clear"], button[title*="Delete"]');
  if (clearCartBtn) {
    await clearCartBtn.click();
    await page.waitForTimeout(500);
  }

  // --- TABS AUDIT ---
  const tabs = [
    { id: 'inventory', url: 'https://one-clothing.vercel.app/dashboard?tab=inventory', name: 'Inventory & Barcodes' },
    { id: 'advance_orders', url: 'https://one-clothing.vercel.app/dashboard?tab=advance_orders', name: 'Advance Orders' },
    { id: 'birthdays', url: 'https://one-clothing.vercel.app/dashboard?tab=birthdays', name: 'Birthdays' },
    { id: 'expenses', url: 'https://one-clothing.vercel.app/dashboard?tab=expenses', name: 'Expenses' },
    { id: 'order_history', url: 'https://one-clothing.vercel.app/dashboard?tab=order_history', name: 'Order History' },
    { id: 'pos_analytics', url: 'https://one-clothing.vercel.app/dashboard?tab=pos_analytics', name: 'Analytics Dashboard' },
    { id: 'coupons', url: 'https://one-clothing.vercel.app/dashboard?tab=coupons', name: 'Coupons' }
  ];

  for (const t of tabs) {
    console.log(`4. Auditing tab: ${t.name} (${t.id})...`);
    await page.goto(t.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${t.id}-desktop.png`) });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${t.id}-mobile.png`) });
    await page.setViewportSize({ width: 1280, height: 800 });

    auditData.tokensByPage[t.id] = await getDesignTokens(page);
    auditData.copyByPage[t.id] = await getPageCopy(page);

    // If modal triggers exist (e.g. Add Product, Add Expense, Add Advance Order, Add Coupon, Barcode modal)
    if (t.id === 'inventory') {
      const addProdBtn = await page.$('button:has-text("Add Product"), button:has-text("New Product"), button:has-text("+ Add")');
      if (addProdBtn) {
        console.log('Opening Add Product modal...');
        await addProdBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-add-product-modal.png') });
        auditData.copyByPage['inventory-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
        if (cancelBtn) await cancelBtn.click();
      }

      // Check Barcode print button
      const barcodeBtn = await page.$('button:has-text("Barcode"), button:has-text("Print Barcode"), button:has-text("Print Labels")');
      if (barcodeBtn) {
        console.log('Opening Barcode modal...');
        await barcodeBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'inventory-barcode-modal.png') });
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
        if (cancelBtn) await cancelBtn.click();
      }
    }

    if (t.id === 'advance_orders') {
      const newAdvBtn = await page.$('button:has-text("New Advance Order"), button:has-text("Add Order"), button:has-text("+")');
      if (newAdvBtn) {
        console.log('Opening Advance Order modal...');
        await newAdvBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'advance-orders-new-modal.png') });
        auditData.copyByPage['advance-orders-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close")');
        if (cancelBtn) await cancelBtn.click();
      }
    }

    if (t.id === 'expenses') {
      const addExpBtn = await page.$('button:has-text("Add Expense"), button:has-text("New Expense"), button:has-text("+")');
      if (addExpBtn) {
        console.log('Opening Add Expense modal...');
        await addExpBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expenses-add-modal.png') });
        auditData.copyByPage['expenses-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close")');
        if (cancelBtn) await cancelBtn.click();
      }
    }

    if (t.id === 'coupons') {
      const addCpnBtn = await page.$('button:has-text("Create Coupon"), button:has-text("New Coupon"), button:has-text("Add Coupon")');
      if (addCpnBtn) {
        console.log('Opening Coupon modal...');
        await addCpnBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'coupons-create-modal.png') });
        auditData.copyByPage['coupons-modal'] = await getPageCopy(page);
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Close")');
        if (cancelBtn) await cancelBtn.click();
      }
    }

    if (t.id === 'pos_analytics') {
      // Subtabs inside Analytics: Revenue, Product & Category, Inventory, Customer, Billing, Today's Sales, Products, Coupons
      const subtabs = ['Revenue', 'Product & Category', 'Inventory', 'Customer', 'Billing'];
      for (const st of subtabs) {
        const btn = await page.$(`button:has-text("${st}")`);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(800);
          const safeName = st.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `analytics-subtab-${safeName}.png`) });
        }
      }
    }

    if (t.id === 'order_history') {
      // Check view invoice button or first row details
      const viewBtn = await page.$('button:has-text("View"), button:has-text("Print"), [title*="Invoice"], [title*="Receipt"]');
      if (viewBtn) {
        console.log('Opening invoice preview...');
        await viewBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'order-history-invoice-preview.png') });
        const closeBtn = await page.$('button:has-text("Close"), [aria-label="Close"]');
        if (closeBtn) await closeBtn.click();
      }
    }
  }

  // --- Check Standalone Routes ---
  const standaloneRoutes = [
    { path: '/whatsapp-center', name: 'whatsapp-center' },
    { path: '/pos-analytics', name: 'standalone-pos-analytics' },
    { path: '/advance-orders', name: 'standalone-advance-orders' },
    { path: '/expenses', name: 'standalone-expenses' }
  ];

  for (const sr of standaloneRoutes) {
    console.log(`5. Checking standalone route ${sr.path}...`);
    try {
      await page.goto(`https://one-clothing.vercel.app${sr.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${sr.name}.png`) });
      auditData.copyByPage[sr.name] = await getPageCopy(page);
    } catch (e) {
      console.log(`Failed navigating to ${sr.path}: ${e.message}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'audit_master_data.json'), JSON.stringify(auditData, null, 2));
  console.log('Master audit completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Master audit failed:', err);
  process.exit(1);
});
