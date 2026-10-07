const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const standalonePath = path.join(root, 'index.html');
const hubspotPath = path.join(root, 'agent-edge-october-hubspot.html');

assert.equal(fs.existsSync(standalonePath), true, 'The Agent Edge standalone file should exist');
assert.equal(fs.existsSync(hubspotPath), true, 'The Agent Edge HubSpot file should exist');

const requiredBranding = [
  '<title>Agent Edge - October 2026 Market Brief</title>',
  'aria-label="Agent Edge navigation"',
  'aria-label="Agent Edge home"',
  'aria-label="Agent Edge mobile navigation"',
  '>The Agent Edge</h1>',
  '<div class="footer-brand-name">The Agent Edge</div>',
  '<div class="footer-tagline">Monthly Agent Intelligence Brief</div>',
  'Published monthly for CINC<br>Agents and Team Leaders.',
];

const retiredGlobalBranding = [
  '<title>Advisor Edge - September 2026</title>',
  'aria-label="Advisor Edge navigation"',
  'aria-label="Advisor Edge home"',
  'aria-label="Advisor Edge mobile navigation"',
  '>The Advisor Edge</h1>',
  '<div class="footer-brand-name">The Advisor Edge</div>',
  '<div class="footer-tagline">Monthly Advisor Intelligence Brief</div>',
  'Published monthly for CINC<br>Client Advisors and Team Leaders.',
];

for (const filePath of [standalonePath, hubspotPath]) {
  const html = fs.readFileSync(filePath, 'utf8');

  for (const branding of requiredBranding) {
    assert.ok(html.includes(branding), `${path.basename(filePath)} should include: ${branding}`);
  }

  for (const branding of retiredGlobalBranding) {
    assert.equal(html.includes(branding), false, `${path.basename(filePath)} should not include: ${branding}`);
  }
}

console.log('Global Agent Edge branding is synchronized across standalone and HubSpot HTML.');
