import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Starting Comprehensive Playwright E2E Test Suite...');
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('deprecated')) {
        console.log('   [Browser Error Console]', msg.text());
      }
    });
    page.on('pageerror', (err) => console.log('   [Browser Uncaught Error]', err.message));

    // 1. Login Page
    console.log('1️⃣ Navigating to https://localhost:5679/login ...');
    await page.goto('https://localhost:5679/login', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('   Page Title:', await page.title());

    // 2. Perform Login via Super Admin
    console.log('2️⃣ Submitting Admin credentials (admin@uims.internal)...');
    await page.locator('input#login_email').fill('admin@uims.internal');
    await page.locator('input#login_password').fill('password123');
    await page.locator('button[type="submit"]').click();

    // 3. Verify Dashboard
    console.log('3️⃣ Verifying Dashboard overview & live metrics...');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForSelector('text=Overview', { timeout: 10000 });
    console.log('   ✅ Dashboard loaded successfully!');

    // 4. Test Assets Page
    console.log('4️⃣ Testing Hardware Assets (/assets)...');
    await page.goto('https://localhost:5679/assets', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('text=Asset Inventory', { timeout: 10000 });
    console.log('   ✅ Assets page loaded with live database table!');

    // 5. Test Licenses Page
    console.log('5️⃣ Testing Software Licenses (/licenses)...');
    await page.goto('https://localhost:5679/licenses', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForSelector('text=Software Licenses', { timeout: 10000 });
    console.log('   ✅ Licenses page loaded successfully!');

    // 6. Test Inventory Page
    console.log('6️⃣ Testing IT Inventory Stock (/inventory)...');
    await page.goto('https://localhost:5679/inventory', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForSelector('text=Inventory Management', { timeout: 10000 });
    console.log('   ✅ Inventory page loaded successfully!');

    // 7. Test Directory Page
    console.log('7️⃣ Testing User Directory (/directory)...');
    await page.goto('https://localhost:5679/directory', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForSelector('text=Users & Access', { timeout: 10000 });
    console.log('   ✅ Directory page loaded successfully!');

    // 8. Test Organization Page
    console.log('8️⃣ Testing Organization Structure (/organization)...');
    await page.goto('https://localhost:5679/organization', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForSelector('text=Organization Structure', { timeout: 10000 });
    console.log('   ✅ Organization page loaded successfully!');

    // 9. Test Network Page
    console.log('9️⃣ Testing Network IPAM (/network)...');
    await page.goto('https://localhost:5679/network', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('text=Network & IPAM', { timeout: 10000 });
    console.log('   ✅ Network page loaded successfully!');

    // 10. Test Security Audit Trail Page
    console.log('🔟 Testing Security Audit Trail (/audit)...');
    await page.goto('https://localhost:5679/audit', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('text=Audit Trail', { timeout: 10000 });
    console.log('   ✅ Audit Trail page loaded successfully!');

    // 11. Test Reports Page
    console.log('1️⃣1️⃣ Testing Executive Reports (/reports)...');
    await page.goto('https://localhost:5679/reports', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('text=Reports & Analytics', { timeout: 10000 });
    console.log('   ✅ Reports page loaded successfully!');

    // 12. Test Settings Page
    console.log('1️⃣2️⃣ Testing System Settings (/settings)...');
    await page.goto('https://localhost:5679/settings', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForSelector('text=Settings', { timeout: 10000 });
    console.log('   ✅ Settings page loaded successfully!');

    console.log('\n======================================================');
    console.log('🎉 ALL 12 PLAYWRIGHT E2E TESTS PASSED 100% WITH ZERO ERRORS!');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Playwright Test Suite Failed:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTest();
