const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const newsletterUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const cards = page.locator('#product-launch .mt-pc-card');
    assert.equal(await cards.count(), 4, 'All four Product Update cards should remain visible');
    assert.equal(
      await page.locator('#product-launch button.mt-pc-card').count(),
      0,
      'Product Update cards should no longer be interactive buttons'
    );
    assert.equal(
      await page.locator('#product-launch [data-modal-target]').count(),
      0,
      'Product Update cards should not retain popup targets'
    );

    for (let index = 0; index < 4; index += 1) {
      await cards.nth(index).click();
      assert.equal(
        await page.locator('[role="dialog"]:visible').count(),
        0,
        'Selecting a Product Update card should not open a popup'
      );
    }

    console.log('All four Product Update cards remain visible and no longer open popups.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
