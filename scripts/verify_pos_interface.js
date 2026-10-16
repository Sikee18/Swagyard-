const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Reset dev_db.json to fresh seed data
const SEED_FILE = path.join(__dirname, '..', 'prisma', 'seed_data.json');
const DEV_DB_FILE = path.join(__dirname, '..', 'prisma', 'dev_db.json');
if (fs.existsSync(SEED_FILE)) {
  fs.copyFileSync(SEED_FILE, DEV_DB_FILE);
  console.log('Reset dev_db.json to clean seed state.');
}

async function verifyPosInterface() {
  console.log('--- STARTING POS INTERFACE VERIFICATION ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login
  console.log('1. Logging in to http://localhost:3001/admin-login...');
  await page.goto('http://localhost:3001/admin-login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('Logged in successfully!');

  // Check Low Stock Alarm modal and dismiss
  const alarmModal = await page.waitForSelector('text=Low Stock Alarm Active', { timeout: 4000 }).catch(() => null);
  if (alarmModal) {
    console.log('Dismissing Low Stock Alarm modal...');
    await page.click('button:has-text("Silence Alarm & Acknowledge")');
    await page.waitForTimeout(600);
  }

  const offlineBtn = page.locator('button:has-text("OFFLINE")');
  const onlineBtn = page.locator('button:has-text("ONLINE")');
  if (await onlineBtn.isVisible()) {
    await onlineBtn.click();
    await page.waitForTimeout(400);
    console.log('Switched to ONLINE mode');
    await offlineBtn.click();
    await page.waitForTimeout(400);
    console.log('Switched to OFFLINE mode');
  }

  // 3. Test 2-way sync: Type in left side Customer Details and check right side Current Order
  console.log('3. Testing two-way sync for Customer Details...');
  const leftNameInput = page.locator('input[placeholder="Enter name"]').first();
  const leftPhoneInput = page.locator('input[placeholder="Enter WhatsApp number"]').first();

  await leftNameInput.fill('Vignesh Retail');
  await leftPhoneInput.fill('9840123456');
  await page.waitForTimeout(500);

  // Check right side inputs
  const rightNameInput = page.locator('input[placeholder="Enter name"]').nth(1);
  const rightPhoneInput = page.locator('input[placeholder="Enter WhatsApp number"]').nth(1);

  const rightNameVal = await rightNameInput.inputValue();
  const rightPhoneVal = await rightPhoneInput.inputValue();
  console.log(`Right side synced values: Name="${rightNameVal}", Phone="${rightPhoneVal}"`);

  if (rightNameVal !== 'Vignesh Retail' || rightPhoneVal !== '9840123456') {
    throw new Error(`Sync failed! Expected Vignesh Retail / 9840123456, got ${rightNameVal} / ${rightPhoneVal}`);
  }
  console.log('PASS: Typing in left side automatically updated right side Current Order!');

  // Capture screenshot of empty order with customer details
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-pos-customer-details-synced.png') });

  // 4. Test Search Catalog Button and Modal
  console.log('4. Testing Search Catalog Button and Modal...');
  const searchCatalogBtn = page.locator('button:has-text("Search Catalog")');
  await searchCatalogBtn.click();
  await page.waitForSelector('text=Search Catalog', { timeout: 5000 });
  await page.waitForTimeout(600);

  // Verify Category pills
  console.log('Verifying category pills in Search Catalog...');
  await page.waitForSelector('button:has-text("ALL")', { timeout: 3000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-pos-search-catalog-modal.png') });

  // Add an item from Search Catalog
  console.log('Adding product from Search Catalog...');
  const firstCard = page.locator('div[role="dialog"] div.cursor-pointer').first();
  await firstCard.click();
  await page.waitForTimeout(600);

  // Close catalog modal
  const doneCatalogBtn = page.locator('button:has-text("Done")');
  await doneCatalogBtn.click();
  await page.waitForTimeout(600);

  // 5. Verify Item added to Order Items and Current Order
  console.log('5. Verifying Order Items table and Current Order summary...');
  await page.waitForSelector('text=Order Items (1)', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-pos-items-in-cart.png') });

  // 6. Test Save as Deposit Order modal
  console.log('6. Testing Save as Deposit Order button...');
  const depositBtn = page.locator('button:has-text("SAVE AS DEPOSIT ORDER")');
  await depositBtn.click();
  await page.waitForSelector('text=Save as Deposit Order', { timeout: 5000 });
  await page.waitForSelector('text=ADVANCE PAYMENT ONLY', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-pos-deposit-order-modal.png') });

  // Close deposit modal
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(500);

  // 7. Complete Sale
  console.log('7. Testing Complete Sale...');
  const completeSaleBtn = page.locator('button:has-text("COMPLETE SALE")');
  await completeSaleBtn.click();

  await page.waitForSelector('text=Order Completed Successfully!', { timeout: 15000 });
  console.log('PASS: Sale completed! Thermal Receipt modal visible.');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'swagyard-pos-sale-completed-receipt.png') });

  await browser.close();
  console.log('--- ALL POS INTERFACE TESTS PASSED PERFECTLY! ---');
}

verifyPosInterface().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
