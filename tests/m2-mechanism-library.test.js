const assert = require('assert');
const { assertDirectoryExists, assertFileExists, assertIncludesAll, readJson, readText } = require('./test-utils');

const curatedDefinitionsDir = assertDirectoryExists('mechanisms/definitions');
assert.ok(curatedDefinitionsDir, 'Expected mechanism definitions directory to resolve.');

const curatedOverridesPath = 'mechanisms/definitions/curated-overrides.json';
assertFileExists(curatedOverridesPath);
const curatedOverrides = readJson(curatedOverridesPath);

assert.ok(
  curatedOverrides && typeof curatedOverrides === 'object' && !Array.isArray(curatedOverrides),
  'Expected curated mechanism overrides JSON to be a plain object keyed by animationId.',
);

const curatedIds = Object.keys(curatedOverrides).sort();
assert.ok(
  curatedIds.length >= 5,
  'Expected curated mechanism definitions to include multiple mechanisms for M2 inspection.',
);

curatedIds.forEach((animationId) => {
  const definition = curatedOverrides[animationId];
  assert.ok(definition && typeof definition === 'object', `Definition "${animationId}" must be an object.`);
  assert.strictEqual(
    definition.id,
    animationId,
    `Definition "${animationId}" must include matching "id" field.`,
  );
  assert.ok(
    typeof definition.title === 'string' && definition.title.trim().length > 0,
    `Definition "${animationId}" must include a non-empty title.`,
  );
  assert.ok(
    typeof definition.summary === 'string' && definition.summary.trim().length > 0,
    `Definition "${animationId}" must include a non-empty summary.`,
  );
  assert.ok(
    typeof definition.path === 'string' && definition.path.trim().length > 0,
    `Definition "${animationId}" must include a non-empty SVG path.`,
  );
  assert.ok(
    Array.isArray(definition.steps) && definition.steps.length > 0,
    `Definition "${animationId}" must include at least one mechanism step.`,
  );
});

assertFileExists('scripts/sync-mechanism-definitions.mjs');
assertFileExists('scripts/sync-mechanism-renderer.mjs');
assertFileExists('src/js/mechanism-definitions.js');
assertFileExists('public/js/mechanism-definitions.js');
assertFileExists('src/js/mechanism-canvas-renderer.js');
assertFileExists('public/js/mechanism-canvas-renderer.js');
assert.strictEqual(
  readText('src/js/mechanism-definitions.js'),
  readText('public/js/mechanism-definitions.js'),
  'Generated mechanism definitions module should stay in sync across src/public.',
);
assert.strictEqual(
  readText('src/js/mechanism-canvas-renderer.js'),
  readText('public/js/mechanism-canvas-renderer.js'),
  'Shared mechanism canvas renderer should stay in sync across src/public.',
);
const rendererSource = readText('src/js/mechanism-canvas-renderer.js');
assert.ok(
  rendererSource.includes('function fitContain('),
  'Renderer must expose fitContain helper as the shared aspect-fit primitive.',
);
assert.ok(
  !rendererSource.includes('ctx.scale(width / viewWidth, height / viewHeight)'),
  'Renderer must not use default non-uniform scaling from width/height ratios.',
);

const previewHtml = readText('public/mechanism-preview.html');
assertIncludesAll(
  previewHtml,
  [
    'Mechanism Preview',
    'id="mechanismSelect"',
    'id="definitionJson"',
    'id="previewPath"',
    'id="previewCanvas"',
    'js/mechanism-canvas-renderer.js',
    'window.OrganicMapCanvasRenderer',
    'drawMechanismCanvasFrame(',
    'selectCueByStep(',
    'function buildStepMilestones(',
    'function syncPreviewCanvas(',
    'function clearPreviewCanvas(',
    'fitToContent: true',
    'preserveAspect: true',
    'stretchToFill: false',
    "fitScope: 'mechanism'",
    'strictStepCues: true',
  ],
  'mechanism preview page',
);
[
  'function calcSceneForDefinition(',
  'function drawSceneFrame(',
  'function fitSceneToCanvas(',
  'function drawSceneArrow(',
  'function inferAtomType(',
].forEach((legacySignature) => {
  assert.ok(
    !previewHtml.includes(legacySignature),
    `mechanism preview page should not keep deprecated local renderer path: ${legacySignature}`,
  );
});
assert.ok(
  previewHtml.includes('aspect-[2/1]'),
  'Mechanism preview canvas container should enforce a 2:1 aspect ratio.',
);

const mapHtml = readText('public/organic-map.html');
assertIncludesAll(
  mapHtml,
  ['js/mechanism-definitions.js', 'js/mechanism-canvas-renderer.js', 'js/animations.js'],
  'organic map mechanism definition script wiring',
);
assert.ok(
  mapHtml.indexOf('js/mechanism-definitions.js') < mapHtml.indexOf('js/animations.js'),
  'Mechanism definitions script should load before animations registry script.',
);
assert.ok(
  mapHtml.indexOf('js/mechanism-canvas-renderer.js') < mapHtml.indexOf('js/main.js'),
  'Mechanism canvas renderer script should load before main map runtime script.',
);
assert.ok(
  mapHtml.includes('id="animationCanvas"') && mapHtml.includes('aspect-[2/1]'),
  'Organic map mechanism canvas should be wrapped in a 2:1 aspect ratio container.',
);

const packageJson = readJson('package.json');
assert.ok(
  packageJson.scripts && packageJson.scripts['sync-renderer'],
  'package.json should expose a sync-renderer script for src/public renderer parity.',
);
assert.ok(
  packageJson.scripts && typeof packageJson.scripts.pretest === 'string' && packageJson.scripts.pretest.includes('sync-renderer'),
  'package.json pretest should sync renderer before tests.',
);
assert.ok(
  packageJson.scripts && typeof packageJson.scripts.prebuild === 'string' && packageJson.scripts.prebuild.includes('sync-renderer'),
  'package.json prebuild should sync renderer before builds.',
);

console.log('Verified mechanism definition source folder, generated modules, and preview wiring.');
