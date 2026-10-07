const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const newsletterUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`;
const septemberCincUniversityUrl = 'https://cincsummit.com/products/september-2026-cinc-universityUpdate';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const event = page.locator('.ev-card').filter({ hasText: 'CINC University — Phoenix, AZ' });
    const registrationLink = event.locator('.ev-cta');

    assert.equal(await event.count(), 1, 'The October CINC University event should remain present');
    assert.equal(
      await registrationLink.getAttribute('href'),
      septemberCincUniversityUrl,
      'The October CINC University CTA should use the supplied registration URL'
    );
    assert.equal(await registrationLink.getAttribute('target'), '_blank');
    assert.match(await registrationLink.getAttribute('rel'), /noopener/);

    console.log('The October CINC University event uses the supplied registration URL safely.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
