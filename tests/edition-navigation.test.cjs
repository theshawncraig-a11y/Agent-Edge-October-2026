const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const septemberPath = path.resolve(__dirname, '..', 'index.html');
const newsletterUrl = `file://${septemberPath}`;
const augustHref = 'https://www.cincpro.com/hubfs/Advisor%20and%20Agent%20Edge/advisor-edge-august-27.html';
const cincUHref = 'https://www.cinccommunity.com/cincuniversity';

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await desktop.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const desktopLink = desktop.locator('.nav-side .nav-cta');
    assert.equal(await desktop.locator('.nav-side a').count(), 1, 'Desktop utility navigation should contain only the CINC U registration action');
    assert.equal(await desktopLink.count(), 1, 'The CINC U registration should use the primary blue navigation pill');
    assert.equal(await desktopLink.getAttribute('href'), cincUHref);
    assert.equal((await desktopLink.textContent()).trim(), 'CINC U Registration');
    assert.equal(await desktopLink.getAttribute('target'), '_blank', 'CINC U registration should open in a new tab');

    const desktopNavFit = await desktop.locator('.nav').evaluate((nav) => {
      const rect = nav.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: document.documentElement.clientWidth,
        linksHeight: nav.querySelector('.nav-links').getBoundingClientRect().height,
      };
    });
    assert.ok(desktopNavFit.left >= 0 && desktopNavFit.right <= desktopNavFit.viewportWidth, 'Desktop navigation should remain within the viewport');
    assert.ok(desktopNavFit.linksHeight < 50, 'Desktop section links should remain on one line');
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });
    await mobile.locator('#mobile-menu-toggle').click();

    const mobileLink = mobile.locator('#mobile-section-menu .mobile-edition-link');
    assert.equal(await mobileLink.count(), 1, 'Mobile navigation should include one previous-edition link');
    assert.equal(await mobileLink.getAttribute('href'), augustHref);
    assert.equal((await mobileLink.textContent()).trim(), 'Previous Edition: August 2026');
    assert.equal(await mobileLink.getAttribute('target'), null);
    assert.ok(
      parseFloat(await mobileLink.evaluate((link) => getComputedStyle(link).borderTopWidth)) >= 1,
      'The mobile edition link should be separated from the in-page section links'
    );

    console.log('Desktop and mobile navigation link to the live August edition without crowding the header.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
