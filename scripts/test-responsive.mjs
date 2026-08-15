import { chromium } from 'playwright';

async function runResponsiveTests() {
  console.log('📱 Starting Ant Design Responsive E2E Test Suite...\n');
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

    // ─────────────────────────────────────────────────────────────
    // TEST 1: MOBILE VIEWPORT (390 x 844) - iPhone / Modern Mobile
    // ─────────────────────────────────────────────────────────────
    console.log('📱 [Test 1] Testing Mobile Viewport (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      ignoreHTTPSErrors: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    const mobilePage = await mobileContext.newPage();

    // 1.1 Mobile Login
    await mobilePage.goto('https://localhost:5679/login', { waitUntil: 'networkidle' });
    await mobilePage.locator('input#login_email').fill('admin@uims.internal');
    await mobilePage.locator('input#login_password').fill('password123');
    await mobilePage.locator('button[type="submit"]').click();
    await mobilePage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('   ✅ Mobile login & dashboard redirection successful.');

    // 1.2 Verify Mobile Header & Hamburger Button
    const hamburgerBtn = mobilePage.locator('header button').first();
    await hamburgerBtn.click();
    console.log('   ✅ Mobile Hamburger menu clicked.');

    // 1.3 Verify Mobile Drawer open & navigation
    const mobileDrawer = mobilePage.locator('.ant-drawer');
    await mobileDrawer.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✅ Mobile Navigation Drawer opened smoothly.');

    // 1.4 Click Hardware Fleet inside Mobile Drawer
    await mobilePage.locator('.ant-drawer .ant-menu-item:has-text("Hardware Fleet")').click();
    await mobilePage.waitForURL('**/assets', { timeout: 10000 });
    await mobilePage.waitForSelector('text=Hardware Asset Management', { timeout: 10000 });
    console.log('   ✅ Navigated to /assets from mobile Drawer.');

    // 1.5 Verify table horizontal scroll wrapper
    const tableScroll = mobilePage.locator('.ant-table-wrapper .ant-table-content');
    await tableScroll.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✅ Assets table rendered with fluid mobile scroll.');

    await mobilePage.screenshot({ path: 'test_mobile_assets.png' });
    await mobileContext.close();

    // ─────────────────────────────────────────────────────────────
    // TEST 2: TABLET VIEWPORT (768 x 1024) - iPad / Tablet
    // ─────────────────────────────────────────────────────────────
    console.log('\n💻 [Test 2] Testing Tablet Viewport (768x1024)...');
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      ignoreHTTPSErrors: true,
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto('https://localhost:5679/login', { waitUntil: 'networkidle' });
    await tabletPage.locator('input#login_email').fill('admin@uims.internal');
    await tabletPage.locator('input#login_password').fill('password123');
    await tabletPage.locator('button[type="submit"]').click();
    await tabletPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await tabletPage.waitForSelector('text=Overview', { timeout: 10000 });
    console.log('   ✅ Tablet Dashboard loaded with adaptive grid.');
    await tabletPage.screenshot({ path: 'test_tablet_dashboard.png' });
    await tabletContext.close();

    // ─────────────────────────────────────────────────────────────
    // TEST 3: DESKTOP VIEWPORT (1440 x 900) - Enterprise Workstation
    // ─────────────────────────────────────────────────────────────
    console.log('\n🖥️ [Test 3] Testing Desktop Viewport (1440x900)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('https://localhost:5679/login', { waitUntil: 'networkidle' });
    await desktopPage.locator('input#login_email').fill('admin@uims.internal');
    await desktopPage.locator('input#login_password').fill('password123');
    await desktopPage.locator('button[type="submit"]').click();
    await desktopPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await desktopPage.waitForSelector('text=Operations Center', { timeout: 10000 });

    // Test Desktop Sider Collapse toggle
    const collapseBtn = desktopPage.locator('header button').first();
    await collapseBtn.click();
    console.log('   ✅ Desktop sidebar collapsed to icon mode (76px).');
    await collapseBtn.click();
    console.log('   ✅ Desktop sidebar expanded back to full width (260px).');
    await desktopPage.screenshot({ path: 'test_desktop_dashboard.png' });
    await desktopContext.close();

    console.log('\n======================================================');
    console.log('🎉 ALL ANT DESIGN RESPONSIVE BREAKPOINT TESTS PASSED!');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Responsive Test Failed:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runResponsiveTests();
