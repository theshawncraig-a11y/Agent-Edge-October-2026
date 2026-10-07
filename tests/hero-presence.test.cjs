const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const newsletterUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`;

function alphaFromColor(color) {
  const match = color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return match ? Number(match[1]) : 1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktop.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const desktopHero = await desktop.locator('.hero').evaluate((hero) => {
      const title = hero.querySelector('h1');
      const edition = hero.querySelector('.hero-edition');
      const tagline = hero.querySelector('.hero-tagline');
      const body = hero.querySelector('.hero-copy p:not(.hero-tagline)');

      return {
        height: hero.getBoundingClientRect().height,
        titleSize: parseFloat(getComputedStyle(title).fontSize),
        editionSize: parseFloat(getComputedStyle(edition).fontSize),
        taglineSize: parseFloat(getComputedStyle(tagline).fontSize),
        taglineColor: getComputedStyle(tagline).color,
        bodySize: parseFloat(getComputedStyle(body).fontSize),
        bodyColor: getComputedStyle(body).color,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    assert.ok(desktopHero.height >= 720 && desktopHero.height <= 820, 'Desktop hero should occupy 720-820px');
    assert.ok(desktopHero.titleSize >= 88 && desktopHero.titleSize <= 96, 'Desktop title should render at 88-96px');
    assert.ok(desktopHero.editionSize >= 12, 'The edition label should be easier to read');
    assert.ok(desktopHero.taglineSize >= 15, 'The hero tagline should render at 15px or larger');
    assert.ok(alphaFromColor(desktopHero.taglineColor) >= 0.95, 'The tagline should have strong contrast');
    assert.ok(desktopHero.bodySize >= 20, 'The supporting sentence should render at 20px or larger');
    assert.ok(alphaFromColor(desktopHero.bodyColor) >= 0.92, 'The supporting sentence should be nearly solid white');
    assert.ok(desktopHero.pageOverflow <= 0, 'The desktop page should not overflow horizontally');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const mobileHero = await mobile.locator('.hero').evaluate((hero) => ({
      height: hero.getBoundingClientRect().height,
      titleSize: parseFloat(getComputedStyle(hero.querySelector('h1')).fontSize),
      taglineSize: parseFloat(getComputedStyle(hero.querySelector('.hero-tagline')).fontSize),
      bodySize: parseFloat(getComputedStyle(hero.querySelector('.hero-copy p:not(.hero-tagline)')).fontSize),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));

    assert.ok(mobileHero.height >= 600 && mobileHero.height < 844, 'Mobile hero should feel substantial while fitting the viewport');
    assert.ok(mobileHero.titleSize >= 54 && mobileHero.titleSize <= 60, 'Mobile title should remain prominent without exceeding two lines');
    assert.ok(mobileHero.taglineSize >= 14, 'Mobile tagline should remain readable');
    assert.ok(mobileHero.bodySize >= 18, 'Mobile supporting copy should remain readable');
    assert.ok(mobileHero.pageOverflow <= 0, 'The mobile page should not overflow horizontally');

    console.log('Hero scale, typography contrast, viewport fit, and responsive sizing are correct.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
