const assert = require('assert');
const srcData = require('../src/js/data');
const publicData = require('../public/js/data');
const srcAnimations = require('../src/js/animations');
const publicAnimations = require('../public/js/animations');
const { readText } = require('./test-utils');

const validateRegistryCoverage = (label, gData, buildAnimationRegistry) => {
  const registry = buildAnimationRegistry(gData.links);
  assert.ok(
    registry && typeof registry === 'object' && !Array.isArray(registry),
    `${label} animation registry should be a plain object.`,
  );

  const animationLinks = gData.links.filter(
    (link) => typeof link.animationId === 'string' && link.animationId.trim().length > 0,
  );

  animationLinks.forEach((link) => {
    const entry = registry[link.animationId];
    assert.ok(entry, `${label} is missing animation registry entry "${link.animationId}".`);
    assert.ok(
      typeof entry.path === 'string' && entry.path.trim().length > 0,
      `${label} animation "${link.animationId}" must include a non-empty SVG path.`,
    );
    assert.ok(
      Array.isArray(entry.steps) && entry.steps.length > 0,
      `${label} animation "${link.animationId}" must include mechanism steps.`,
    );
  });
};

assert.strictEqual(
  typeof srcAnimations.buildAnimationRegistry,
  'function',
  'Expected src animation module to export buildAnimationRegistry.',
);
assert.strictEqual(
  typeof publicAnimations.buildAnimationRegistry,
  'function',
  'Expected public animation module to export buildAnimationRegistry.',
);

validateRegistryCoverage('src', srcData.gData, srcAnimations.buildAnimationRegistry);
validateRegistryCoverage('public', publicData.gData, publicAnimations.buildAnimationRegistry);

const mapHtml = readText('public/organic-map.html');
[
  'animationPanel',
  'animationTitle',
  'animationSummary',
  'animationStep',
  'animationSvg',
  'animationPath',
  'animationMarker',
].forEach((id) => {
  assert.ok(
    mapHtml.includes(`id="${id}"`),
    `Expected map sidebar animation element "${id}" to exist.`,
  );
});

const srcMain = readText('src/js/main.js');
const publicMain = readText('public/js/main.js');
[
  ['src', srcMain],
  ['public', publicMain],
].forEach(([label, contents]) => {
  assert.ok(
    contents.includes('No animation asset is registered for this pathway yet.'),
    `Expected ${label} main.js to handle missing animation assets gracefully.`,
  );
  assert.ok(
    contents.includes('window.OrganicMapAnimations'),
    `Expected ${label} main.js to use the shared animation registry module.`,
  );
});

assert.strictEqual(
  readText('src/js/animations.js'),
  readText('public/js/animations.js'),
  'Expected src and public animation registry modules to stay in sync.',
);

console.log('Verified M2 animation panel wiring and registry coverage.');
