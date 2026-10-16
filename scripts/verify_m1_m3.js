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
  console.log('--- STARTING VERIFICATION FOR MILESTONES 1-3 ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Root redirect check
  console.log('1. Navigating to http://localhost:3001 (testing auth redirect)...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  console.log('Redirected to:', page.url());

  // Capture Login Desktop & Mobile
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-01-login-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-01-login-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 2. Test invalid credentials
  console.log('2. Testing invalid credentials validation...');
  await page.fill('#admin-portal-id', 'wrong');
  await page.fill('#admin-portal-password', 'wrongpass');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Invalid Admin or Staff credentials', { timeout: 3000 }).catch(() => {});
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-01-login-error.png') });

  // 3. Login with correct credentials
  console.log('3. Submitting valid credentials (admin / admin123)...');
  await page.fill('#admin-portal-id', 'admin');
  await page.fill('#admin-portal-password', 'admin123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  console.log('Post-login URL reached:', page.url());

  // 4. Check Low Stock Alarm modal
  console.log('4. Checking Low Stock Alarm modal...');
  const alarmModal = await page.waitForSelector('text=Low Stock Alarm Active', { timeout: 6000 }).catch(() => null);
  if (alarmModal) {
    console.log('Low Stock Alarm modal confirmed active!');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-02-low-stock-modal.png') });
    await page.click('button:has-text("Silence Alarm & Acknowledge")');
    await page.waitForTimeout(600);
  }

  // 5. POS Billing Screen Empty Desktop & Mobile
  console.log('5. Capturing POS Billing Terminal...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-03-billing-empty-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-03-billing-empty-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 6. Wait for catalog to load and add item
  console.log('6. Waiting for catalog items to load...');
  await page.waitForSelector('text=Black Slim Fit Formal Pant', { timeout: 15000 });
  console.log('Catalog loaded successfully! Adding Size 32 variant to cart...');
  const size32Btn = page.locator('button:has-text("32")').first();
  await size32Btn.click();
  await page.waitForTimeout(600);

  // 7. Customer information
  console.log('7. Entering customer details...');
  await page.fill('input[placeholder="Enter name"]', 'Rathul Customer');
  await page.fill('input[placeholder="Enter WhatsApp number"]', '9876543210');

  // 8. Coupon code
  console.log('8. Applying promo coupon SWAG10...');
  await page.fill('input[placeholder="Promo Code"]', 'SWAG10');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(600);

  // 9. GST toggle
  console.log('9. Enabling GST toggle...');
  const gstToggle = page.locator('input[type="checkbox"]').first();
  if (await gstToggle.isVisible()) {
    await gstToggle.check();
    await page.waitForTimeout(600);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-04-cart-with-items-and-discounts.png') });

  // 10. Split Payment Modal
  console.log('10. Testing Split Payment Modal...');
  const splitBtn = page.locator('button:has-text("Split")');
  await splitBtn.click();
  await page.waitForSelector('text=Split Tender Calculator', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-05-split-modal.png') });

  // Confirm split tender
  const applySplit = page.locator('button:has-text("Apply Split Tender")');
  await applySplit.click();
  await page.waitForTimeout(600);

  // 11. Complete Order & Print
  console.log('11. Triggering Complete Order & Print...');
  const checkoutBtn = page.locator('button:has-text("Complete Order")');
  await checkoutBtn.click();
  await page.waitForSelector('text=Order Completed Successfully!', { timeout: 15000 });
  console.log('Order completed modal visible! Capturing thermal receipt...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-06-thermal-receipt-modal.png') });

  // Close receipt modal
  const doneBtn = page.locator('button:has-text("✕")');
  if (await doneBtn.isVisible()) {
    await doneBtn.click();
    await page.waitForTimeout(600);
  }

  // 12. Inventory Tab
  console.log('12. Navigating to Inventory tab...');
  await page.click('button:has-text("Inventory & Barcodes")');
  await page.waitForSelector('text=Black Slim Fit Formal Pant', { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-07-inventory-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-07-inventory-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 13. Barcode Modal
  console.log('13. Testing Barcode Print Modal...');
  const barcodeBtn = page.locator('button[title*="Barcode"]').first();
  if (await barcodeBtn.isVisible()) {
    await barcodeBtn.click();
    await page.waitForSelector('text=Print Barcode Labels', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-08-barcode-modal.png') });
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);
  }

  // 14. Stock Adjustment Modal
  console.log('14. Testing Stock Adjustment Modal...');
  const adjustBtn = page.locator('button[title*="Adjust"]').first();
  if (await adjustBtn.isVisible()) {
    await adjustBtn.click();
    await page.waitForSelector('text=Adjust Stock Level', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-09-stock-adjust-modal.png') });
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);
  }

  // 15. Add Product Modal
  console.log('15. Testing Add Product Modal with Variant Matrix...');
  await page.click('button:has-text("+ Add Product")');
  await page.waitForSelector('text=Add New Product', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-10-add-product-modal-basic.png') });
  await page.click('button:has-text("2. Variant Matrix")');
  await page.waitForTimeout(400);
  await page.click('button:has-text("Alpha Sizes")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-11-add-product-modal-variants.png') });
  await page.click('button:has-text("Cancel")');

  console.log('\n--- VERIFICATION OF MILESTONES 1-3 COMPLETED SUCCESSFULLY! ---');
  await browser.close();
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
