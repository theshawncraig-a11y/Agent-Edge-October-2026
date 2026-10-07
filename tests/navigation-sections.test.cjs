const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const expectedSections = [
  ['Client Spotlight', '#client-spotlight'],
  ['Lead ROI', '#lead-roi'],
  ['State Rankings', '#state-market-index'],
  ['Upcoming Events', '#september-events'],
  ['Resources', '#latest-cinc-articles'],
];

function linksWithin(markup) {
  return Array.from(markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g), (match) => [
    match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    match[1],
  ]);
}

const desktopNav = html.match(/<nav class="nav"[\s\S]*?<div class="nav-links">([\s\S]*?)<\/div>/);
assert.ok(desktopNav, 'Desktop navigation should exist');
assert.deepEqual(linksWithin(desktopNav[1]), expectedSections, 'Desktop navigation should match the section labels, order, and anchors');

const main = html.match(/<main>([\s\S]*?)<\/main>/);
assert.ok(main, 'Main content should exist');
const navHrefs = new Set(expectedSections.map(([, href]) => href));
const sectionOrder = Array.from(main[1].matchAll(/<section\b[^>]*\bid="([^"]+)"/g), (match) => `#${match[1]}`)
  .filter((href) => navHrefs.has(href));
assert.deepEqual(sectionOrder, expectedSections.map(([, href]) => href), 'Navigation and DOM section order should agree');

for (const [label, href] of expectedSections) {
  const id = href.slice(1);
  assert.equal((html.match(new RegExp(`\\bid="${id}"`, 'g')) || []).length, 1, `${label} should have one matching section ID`);
}

assert.match(html, /\.section\s*\{[\s\S]*?scroll-margin-top:\s*(?:9\d|1\d{2})px;/, 'Sections should clear the fixed navigation when anchored');
assert.match(html, /id="mobile-menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="mobile-section-menu"/, 'Mobile navigation should expose an accessible menu button');

const mobileMenu = html.match(/<div class="mobile-section-menu" id="mobile-section-menu" hidden>([\s\S]*?)<\/div>/);
assert.ok(mobileMenu, 'Mobile section menu should exist and start collapsed');
const mobileSectionLinks = linksWithin(mobileMenu[1]).filter(([, href]) => href.startsWith('#'));
assert.deepEqual(mobileSectionLinks, expectedSections, 'Mobile navigation should mirror the desktop section links');

assert.match(html, /mobileMenuToggle\.addEventListener\('click'/, 'The mobile menu button should toggle the menu');
assert.match(html, /e\.key === 'Escape'[\s\S]*?closeMobileMenu\(\)/, 'Escape should close the mobile menu');
assert.match(html, /sectionObserver\s*=\s*new IntersectionObserver/, 'Section changes should update the active navigation state');
assert.match(html, /setCurrentSection\(/, 'Navigation should expose the current section accessibly');

class FakeElement {
  constructor(attributes = {}) {
    this.attributes = new Map(Object.entries(attributes));
    this.listeners = {};
    this.hidden = false;
    this.children = [];
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  dispatch(type, event = {}) {
    this.listeners[type]?.({ target: this, ...event });
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector(selector) {
    return selector === 'a' ? this.children[0] : null;
  }

  focus() {
    fakeDocument.activeElement = this;
  }

  contains(target) {
    return target === this || this.children.includes(target);
  }
}

const desktopLinks = expectedSections.map(([, href]) => new FakeElement({ href }));
const mobileLinks = expectedSections.map(([, href]) => new FakeElement({ href }));
const sections = expectedSections.map(([, href]) => ({ id: href.slice(1) }));
const menuToggle = new FakeElement({ 'aria-expanded': 'false' });
const mobileMenuHarness = new FakeElement();
mobileMenuHarness.hidden = true;
mobileMenuHarness.children = mobileLinks;
const mobileNav = new FakeElement();
mobileNav.children = [menuToggle, mobileMenuHarness, ...mobileLinks];

const documentListeners = {};
const fakeDocument = {
  activeElement: null,
  querySelectorAll(selector) {
    if (selector === '.nav-links a[href^="#"]') return desktopLinks;
    if (selector === '.mobile-section-menu a[href^="#"]') return mobileLinks;
    return [];
  },
  querySelector(selector) {
    if (selector === '.mobile-nav') return mobileNav;
    return null;
  },
  getElementById(id) {
    if (id === 'mobile-menu-toggle') return menuToggle;
    if (id === 'mobile-section-menu') return mobileMenuHarness;
    return sections.find((section) => section.id === id) || null;
  },
  addEventListener(type, handler) {
    documentListeners[type] = handler;
  },
};

let observerCallback;
class FakeIntersectionObserver {
  constructor(callback) {
    observerCallback = callback;
  }

  observe() {}
}

const fakeWindow = {
  IntersectionObserver: FakeIntersectionObserver,
  location: { hash: '' },
};

const controller = html.match(/\/\/ Page section navigation\s+([\s\S]*?\n    \}\)\(\);)/);
assert.ok(controller, 'Page section navigation controller should exist');
new Function('document', 'window', 'IntersectionObserver', controller[1])(
  fakeDocument,
  fakeWindow,
  FakeIntersectionObserver
);

menuToggle.dispatch('click');
assert.equal(menuToggle.getAttribute('aria-expanded'), 'true');
assert.equal(mobileMenuHarness.hidden, false);
assert.equal(fakeDocument.activeElement, mobileLinks[0], 'Opening the mobile menu should focus its first link');

mobileLinks[2].dispatch('click');
assert.equal(mobileMenuHarness.hidden, true, 'Selecting a mobile link should close the menu');
assert.equal(desktopLinks[2].getAttribute('aria-current'), 'location');
assert.equal(mobileLinks[2].getAttribute('aria-current'), 'location');

menuToggle.dispatch('click');
documentListeners.keydown({ key: 'Escape' });
assert.equal(menuToggle.getAttribute('aria-expanded'), 'false');
assert.equal(mobileMenuHarness.hidden, true, 'Escape should close the mobile menu');
assert.equal(fakeDocument.activeElement, menuToggle, 'Escape should return focus to the menu button');

observerCallback([{ isIntersecting: true, intersectionRatio: 0.8, target: sections[4] }]);
assert.equal(desktopLinks[4].getAttribute('aria-current'), 'location', 'Section observation should update the desktop active state');
assert.equal(mobileLinks[4].getAttribute('aria-current'), 'location', 'Section observation should update the mobile active state');

console.log('Desktop and mobile navigation labels, order, anchors, active states, and controls are correct.');
