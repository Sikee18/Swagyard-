const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Reset dev_db.json to fresh seed data
const SEED_FILE = path.join(__dirname, '..', 'prisma', 'seed_data.json');
const DEV_DB_FILE = path.join(__dirname, '..', 'prisma', 'dev_db.json');
if (fs.existsSync(SEED_FILE)) {
  fs.copyFileSync(SEED_FILE, DEV_DB_FILE);
  console.log('Reset dev_db.json to clean seed state.');
}

async function verify() {
  console.log('--- STARTING VERIFICATION FOR MILESTONES 4-6 ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Login
  console.log('1. Logging into Swagyard Admin Portal...');
  await page.goto('http://localhost:3001/admin-login', { waitUntil: 'networkidle' });
  await page.fill('#admin-portal-id', 'admin');
  await page.fill('#admin-portal-password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Silence alarm if displayed
  const alarmModal = await page.waitForSelector('text=Low Stock Alarm Active', { timeout: 4000 }).catch(() => null);
  if (alarmModal) {
    await page.click('button:has-text("Silence Alarm & Acknowledge")');
    await page.waitForTimeout(500);
  }

  // 2. Add an item and checkout to ensure fresh order in history
  console.log('2. Adding an item to cart and completing checkout...');
  await page.click('button:has-text("Search Catalog")');
  await page.waitForTimeout(500);
  const firstCard = page.locator('[data-testid="catalog-product-card"]').first();
  await firstCard.click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Done")');
  await page.waitForTimeout(500);

  const nameInput = page.locator('input[placeholder="Enter name"]').first();
  await nameInput.fill('Vikram S');
  const phoneInput = page.locator('input[placeholder="Enter WhatsApp number"]').first();
  await phoneInput.fill('9840123456');

  // Complete Order
  const checkoutBtn = page.locator('button:has-text("COMPLETE SALE")');
  await checkoutBtn.click();
  await page.waitForSelector('text=Order Completed Successfully!', { timeout: 15000 });
  console.log('Order completed! Capturing invoice number...');

  // Capture the invoice number from the receipt modal
  let invoiceNo = null;
  try {
    const invoiceNoEl = page.locator('[data-testid="receipt-invoice-no"]');
    if (await invoiceNoEl.count() > 0) {
      invoiceNo = (await invoiceNoEl.innerText()).replace(/^#/, '').trim();
    } else {
      // Fallback: read from page URL or from orders API
      const ordersRes = await page.evaluate(() => fetch('/api/orders?limit=1').then(r => r.json()));
      invoiceNo = ordersRes?.orders?.[0]?.invoiceNo || null;
    }
  } catch (e) {
    console.log('Could not capture invoice number:', e.message);
  }
  console.log('Invoice No captured:', invoiceNo);

  // Click the receipt close button
  const closeX = page.locator('[data-testid="receipt-close"]');
  if (await closeX.count() > 0) {
    await closeX.click({ force: true });
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);

  // Ensure no modal is blocking the UI
  const modalStillOpen = await page.locator('div[role="dialog"]').count();
  if (modalStillOpen > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }

  // 3. Milestone 4: Order History View
  console.log('3. Navigating to Order History tab...');
  await page.click('button:has-text("Order History")', { force: true });
  await page.waitForSelector('text=Completed Orders', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-12-order-history-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-12-order-history-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Open Order Details Modal
  console.log('Testing Order Details modal...');
  const viewOrderBtn = page.locator('button[title="View Order Details"]').first();
  await viewOrderBtn.click();
  await page.waitForSelector('text=Order #SWAG-', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-13-order-details-modal.png') });
  await page.click('div[role="dialog"] button:has(svg.lucide-x)');
  await page.waitForTimeout(400);

  // 4. Milestone 4: Public Digital Tax Invoice (/invoice/:id)
  console.log('4. Testing Public Digital Invoice (/invoice/:id)...');
  const invoicePage = await context.newPage();
  const invoiceId = invoiceNo || 'SWAG-20261015-0001';
  await invoicePage.goto(`http://localhost:3001/invoice/${invoiceId}`, { waitUntil: 'networkidle' });
  await invoicePage.waitForSelector('text=TAX INVOICE', { timeout: 10000 });
  await invoicePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-14-public-invoice-desktop.png') });

  await invoicePage.setViewportSize({ width: 375, height: 812 });
  await invoicePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-14-public-invoice-mobile.png') });
  await invoicePage.close();

  // 5. Milestone 5: Advance Orders View
  console.log('5. Navigating to Advance Orders tab...');
  await page.click('button:has-text("Advance Orders")');
  await page.waitForSelector('text=Total Advance Orders', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-15-advance-orders-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-15-advance-orders-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Test Booking Modal
  console.log('Testing Book Advance Order modal...');
  await page.click('button:has-text("Book Advance Order")');
  await page.waitForSelector('text=Book New Advance Order', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-16-advance-order-modal.png') });
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(400);

  // 6. Milestone 5: Birthdays View
  console.log('6. Navigating to Birthdays tab...');
  await page.click('button:has-text("Birthdays")');
  await page.waitForSelector('text=Registered Customers', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-17-birthdays-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-17-birthdays-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 7. Milestone 5: Expenses View
  console.log('7. Navigating to Expenses tab...');
  await page.click('button:has-text("Expenses")');
  await page.waitForSelector('text=Total Expenses Recorded', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-18-expenses-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-18-expenses-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Test Record Expense Modal
  console.log('Testing Record Expense modal...');
  await page.click('button:has-text("Record Expense")');
  await page.waitForSelector('text=Record Store Expense', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-19-expense-modal.png') });
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(400);

  // 8. Milestone 5: Coupons View
  console.log('8. Navigating to Coupons tab...');
  await page.click('button:has-text("Coupons")');
  await page.waitForSelector('text=Active Coupons', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-20-coupons-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-20-coupons-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 9. Milestone 6: Analytics Dashboard
  console.log('9. Navigating to Analytics Dashboard...');
  await page.click('button:has-text("Analytics Dashboard")');
  await page.waitForSelector('text=Gross Revenue', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-21-analytics-revenue.png') });

  // Switch to Category & Products subtab
  await page.click('button:has-text("2. Category & Products")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-22-analytics-products.png') });

  // Switch to Payment Tenders subtab
  await page.click('button:has-text("3. Payment Tenders")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-23-analytics-payments.png') });

  // Switch to P&L Financials subtab
  await page.click('button:has-text("4. P&L Financials")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-24-analytics-pnl.png') });

  // 10. Milestone 6: WhatsApp Communications Center
  console.log('10. Navigating to WhatsApp Center...');
  await page.click('button:has-text("WhatsApp Center")');
  await page.waitForSelector('text=WhatsApp Communications Center', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-25-whatsapp-center-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-25-whatsapp-center-mobile.png') });

  console.log('\n--- VERIFICATION FOR MILESTONES 4-6 COMPLETED SUCCESSFULLY! ---');
  await browser.close();
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
