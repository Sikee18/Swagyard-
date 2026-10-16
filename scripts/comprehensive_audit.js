const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runAudit() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  const networkRequests = [];
  const consoleMessages = [];

  page.on('request', req => {
    networkRequests.push({
      type: 'request',
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      headers: req.headers(),
      postData: req.postData()
    });
  });

  page.on('response', async res => {
    let body = null;
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('application/json') || ct.includes('text/plain')) {
      try {
        body = await res.text();
      } catch (e) {}
    }
    networkRequests.push({
      type: 'response',
      url: res.url(),
      status: res.status(),
      statusText: res.statusText(),
      headers: res.headers(),
      body: body ? (body.length > 5000 ? body.substring(0, 5000) + '...[TRUNCATED]' : body) : null
    });
  });

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  console.log('--- 1. Navigating to /dashboard (testing redirect) ---');
  await page.goto('https://one-clothing.vercel.app/dashboard', { waitUntil: 'networkidle' });
  console.log('Redirected URL:', page.url());

  // Capture Login Page
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Test empty login validation
  console.log('--- Testing Login Validation ---');
  const submitBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("Sign In")');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(500);
    const emptyValidation = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-error-empty.png') });
  }

  // Perform Login
  console.log('--- Performing Login with admin / admin123 ---');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Post-login URL:', page.url());
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-post-login-initial.png') });

  // Check for any modal (like low stock alert)
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0');
    return modal ? modal.innerText : null;
  });
  console.log('Modal text if present:', modalText);

  // Dismiss modal if present
  const dismissBtn = await page.$('button:has-text("Silence"), button:has-text("Acknowledge"), button:has-text("Close"), button:has-text("Dismiss")');
  if (dismissBtn) {
    console.log('Dismissing initial modal...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-initial-modal.png') });
    await dismissBtn.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-pos-billing-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-pos-billing-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Inspect storage and cookies
  const storageInfo = await page.evaluate(() => {
    return {
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage }
    };
  });
  const cookies = await context.cookies();
  console.log('LocalStorage keys:', Object.keys(storageInfo.localStorage));
  console.log('SessionStorage keys:', Object.keys(storageInfo.sessionStorage));
  console.log('Cookie names:', cookies.map(c => c.name));

  // Extract all nav items & links
  const navData = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('nav a, aside a, [role="navigation"] a, button, a').forEach(el => {
      const href = el.getAttribute('href');
      const text = el.innerText.trim();
      if (text && (href || el.tagName === 'BUTTON')) {
        items.push({
          tag: el.tagName,
          text: text.replace(/\n+/g, ' '),
          href: href || null,
          role: el.getAttribute('role'),
          id: el.id,
          classes: el.className
        });
      }
    });
    return items;
  });

  console.log('Found navigation/button items count:', navData.length);

  // Save audit data
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'initial_nav_dump.json'), JSON.stringify(navData, null, 2));
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'initial_storage.json'), JSON.stringify({
    localStorage: storageInfo.localStorage,
    cookies: cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path, expires: c.expires, httpOnly: c.httpOnly, secure: c.secure }))
  }, null, 2));
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'initial_network.json'), JSON.stringify(networkRequests, null, 2));

  console.log('Initial audit steps completed successfully!');
  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
