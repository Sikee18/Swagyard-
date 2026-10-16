const { chromium } = require('playwright-core');

async function testSidebar() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('https://one-clothing.vercel.app/admin-login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(2000);

  // Dismiss alarm
  const silence = await page.$('button:has-text("Silence"), button:has-text("Acknowledge")');
  if (silence) {
    await silence.click();
    await page.waitForTimeout(1000);
  }

  // Get all buttons or links inside sidebar
  const sidebarNavs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('aside button, aside a, nav button, nav a')).map(el => ({
      text: el.innerText.trim(),
      tagName: el.tagName,
      className: el.className
    }));
  });

  console.log('Sidebar nav items:', JSON.stringify(sidebarNavs, null, 2));
  await browser.close();
}

testSidebar();
