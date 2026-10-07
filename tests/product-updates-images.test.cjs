const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const newsletterUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`;

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await desktop.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const desktopGridColumns = await desktop.locator('#product-launch .mt-pc-grid').evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length
    );
    assert.equal(desktopGridColumns, 2, 'Product Updates should retain its two-column desktop layout');
    await desktop.close();

    const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2 });
    await tablet.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const tabletPanel = tablet.locator('#product-launch');
    const tabletGridColumns = await tabletPanel.locator('.mt-pc-grid').evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length
    );
    assert.equal(tabletGridColumns, 1, 'Product Updates should use one column at tablet widths');

    const tabletImages = await tabletPanel.locator('.mt-pc-media img').evaluateAll((images) =>
      images.map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          renderedWidth: rect.width,
          naturalWidth: image.naturalWidth,
          filter: getComputedStyle(image).filter,
          transform: getComputedStyle(image).transform,
          dpr: window.devicePixelRatio,
        };
      })
    );

    assert.equal(tabletImages.length, 4, 'All four Product Updates banners should remain present');
    tabletImages.forEach((image) => {
      assert.ok(image.renderedWidth >= 700, 'Tablet banners should render wide enough for embedded details to remain legible');
      assert.ok(
        image.naturalWidth >= image.renderedWidth * image.dpr,
        'Each banner should provide at least one source pixel per rendered device pixel'
      );
      assert.equal(image.filter, 'none', 'Product banners should not use a blur or sharpening filter');
      assert.equal(image.transform, 'none', 'Product banners should avoid transformed rasterization');
    });
    await tablet.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });
    assert.equal(
      await mobile.locator('#product-launch .mt-pc-grid').evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length
      ),
      1,
      'Product Updates should remain single-column on mobile'
    );

    console.log('Product Updates banners retain desktop balance and render sharply at tablet and mobile widths.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
