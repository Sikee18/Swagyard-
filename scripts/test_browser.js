const { chromium } = require('playwright-core');

async function test() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  console.log('Browser launched successfully!');
  const page = await browser.newPage();
  await page.goto('https://one-clothing.vercel.app/dashboard');
  console.log('Page title:', await page.title());
  console.log('Current URL:', page.url());
  await browser.close();
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
