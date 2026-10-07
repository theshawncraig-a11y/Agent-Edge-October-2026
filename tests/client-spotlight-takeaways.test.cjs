const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const newsletterUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`;
const articleHref = 'https://www.cincpro.com/blog/how-this-ohio-team-leader-turned-internet-leads-into-a-referral-engine';

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await desktop.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });

    const treatment = await desktop.locator('#client-spotlight').evaluate((section) => {
      const story = section.querySelector('.spotlight-story');
      const items = Array.from(section.querySelectorAll('.spotlight-editorial-item'));
      const numbers = Array.from(section.querySelectorAll('.spotlight-editorial-number'));
      const titles = Array.from(section.querySelectorAll('.spotlight-editorial-copy h3'));
      const descriptions = Array.from(section.querySelectorAll('.spotlight-editorial-copy p'));
      const highlights = Array.from(section.querySelectorAll('.spotlight-editorial-copy em'));
      const articleLink = section.querySelector('.spotlight-media .spotlight-secondary-link');
      const mediaActions = section.querySelectorAll('.spotlight-media .spotlight-actions a');
      const storyStyles = getComputedStyle(story);
      const linkStyles = articleLink ? getComputedStyle(articleLink) : null;

      return {
        oldPanelCount: section.querySelectorAll('.spotlight-takeaway-list').length,
        itemCount: items.length,
        itemBackgrounds: items.map((item) => getComputedStyle(item).backgroundColor),
        itemBorders: items.map((item) => getComputedStyle(item).borderTopWidth),
        numbers: numbers.map((number) => number.textContent.trim()),
        titleText: titles.map((title) => title.textContent.replace(/\s+/g, ' ').trim()),
        titleSizes: titles.map((title) => parseFloat(getComputedStyle(title).fontSize)),
        descriptionText: descriptions.map((description) => description.textContent.replace(/\s+/g, ' ').trim()),
        descriptionSizes: descriptions.map((description) => parseFloat(getComputedStyle(description).fontSize)),
        highlightColors: highlights.map((highlight) => getComputedStyle(highlight).color),
        storyBackground: storyStyles.backgroundColor,
        storyBorder: storyStyles.borderTopWidth,
        storyActionCount: section.querySelectorAll('.spotlight-story a').length,
        linkHref: articleLink?.getAttribute('href') || '',
        linkBorder: linkStyles ? parseFloat(linkStyles.borderTopWidth) : 0,
        linkRadius: linkStyles ? parseFloat(linkStyles.borderRadius) : 0,
        mediaActionCount: mediaActions.length,
        mediaActionText: Array.from(mediaActions, (link) => link.textContent.replace(/\s+/g, ' ').trim()),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    assert.equal(treatment.oldPanelCount, 0, 'The oversized white takeaway panel should be removed');
    assert.equal(treatment.itemCount, 3, 'All three original takeaways should be restored');
    assert.deepEqual(treatment.numbers, ['01', '02', '03'], 'The takeaways should retain their numbered reading order');
    assert.deepEqual(treatment.titleText, [
      'CRM-hopping ends where the platform is complete.',
      'Scripting that disarms the objection before it happens.',
      'Results compound into a referral engine.',
    ], 'All three takeaway headlines should match the current client story');
    assert.match(treatment.descriptionText[0], /website, CRM, mobile app, AI, and ad spend/);
    assert.match(treatment.descriptionText[1], /before they even have a chance to put up a wall/);
    assert.match(treatment.descriptionText[2], /\$1\.275M cash/);
    assert.ok(treatment.titleSizes.every((size) => size >= 17), 'Each takeaway headline should remain scannable');
    assert.ok(treatment.descriptionSizes.every((size) => size >= 14), 'The supporting copy should remain readable');
    assert.ok(treatment.itemBackgrounds.every((background) => background === 'rgba(0, 0, 0, 0)'), 'Takeaways should remain unboxed');
    assert.equal(treatment.itemBorders[0], '0px', 'The first takeaway should not begin with a divider');
    assert.ok(treatment.itemBorders.slice(1).every((width) => width === '1px'), 'Later takeaways should use quiet hairline dividers');
    assert.equal(treatment.storyBackground, 'rgba(0, 0, 0, 0)', 'The story should sit directly on the dark section background');
    assert.equal(treatment.storyBorder, '0px', 'The story should not become another card');
    assert.equal(treatment.highlightColors.length, 3, 'Each takeaway headline should include one restrained brand-color emphasis');
    assert.equal(treatment.storyActionCount, 0, 'The text column should no longer contain an action');
    assert.equal(treatment.linkHref, articleHref, 'The article pill should lead to the client article');
    assert.ok(treatment.linkBorder >= 1, 'The article action should use a restrained outline');
    assert.ok(treatment.linkRadius >= 20, 'The article action should retain the pill silhouette');
    assert.equal(treatment.mediaActionCount, 2, 'Both actions should sit beneath the video');
    assert.deepEqual(treatment.mediaActionText, ['Watch the spotlight ›', 'Read the article ›']);
    assert.ok(treatment.overflow <= 0, 'The desktop section should not overflow horizontally');
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(newsletterUrl, { waitUntil: 'domcontentloaded' });
    const mobileState = await mobile.locator('#client-spotlight').evaluate((section) => ({
      columns: getComputedStyle(section.querySelector('.client-spotlight-frame')).gridTemplateColumns.split(' ').length,
      itemCount: section.querySelectorAll('.spotlight-editorial-item').length,
      actionWidths: Array.from(section.querySelectorAll('.spotlight-media .spotlight-actions a'), (link) => link.getBoundingClientRect().width),
      viewportWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    assert.equal(mobileState.columns, 1, 'The editorial takeaways and video should stack on mobile');
    assert.equal(mobileState.itemCount, 3, 'All three takeaways should remain present on mobile');
    assert.equal(mobileState.actionWidths.length, 2, 'Both actions should remain available on mobile');
    assert.ok(mobileState.actionWidths.every((width) => width < mobileState.viewportWidth), 'Both actions should fit the mobile viewport');
    assert.ok(mobileState.overflow <= 0, 'The mobile section should not overflow horizontally');

    console.log('Client Spotlight restores all three takeaways in a dark, unboxed editorial format with responsive layout.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
