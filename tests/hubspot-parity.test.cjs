const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const standalonePath = path.join(root, 'index.html');
const hubspotPath = path.join(root, 'agent-edge-october-hubspot.html');
const hostedBase = 'https://theshawncraig-a11y.github.io/Agent-Edge-October-2026/';

assert.equal(fs.existsSync(hubspotPath), true, 'The October HubSpot HTML file should exist');

const standalone = fs.readFileSync(standalonePath, 'utf8');
const hubspot = fs.readFileSync(hubspotPath, 'utf8');
const normalizedHubspot = hubspot.split(hostedBase).join('');

assert.equal(normalizedHubspot, standalone, 'HubSpot and standalone HTML should differ only by the hosted asset base');
assert.doesNotMatch(hubspot, /(?:src|href)=["']assets\//, 'HubSpot markup should not contain relative asset URLs');
assert.doesNotMatch(hubspot, /url\(\s*["']?assets\//, 'HubSpot CSS should not contain relative asset URLs');

const assetReferences = new Set(Array.from(standalone.matchAll(/assets\/[^"')\s]+/g), (match) => match[0]));
assert.ok(assetReferences.size >= 20, 'The parity check should cover the complete September asset set');

for (const reference of assetReferences) {
  const assetPath = path.join(root, decodeURIComponent(reference));
  assert.equal(fs.existsSync(assetPath), true, `Standalone asset should exist: ${reference}`);
  assert.ok(hubspot.includes(`${hostedBase}${reference}`), `HubSpot should use the hosted URL for: ${reference}`);
}

for (const html of [standalone, hubspot]) {
  const ids = Array.from(html.matchAll(/\bid=["']([^"']+)["']/g), (match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], [], 'HTML IDs should remain unique');

  for (const tag of ['div', 'section', 'article', 'style', 'script']) {
    const opening = (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
    const closing = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    assert.equal(opening, closing, `${tag} tags should remain balanced`);
  }
}

console.log(`HubSpot parity, ${assetReferences.size} hosted asset references, unique IDs, and balanced structural tags are correct.`);
