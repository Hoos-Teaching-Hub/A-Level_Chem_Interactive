const assert = require('assert');
const { readText } = require('./test-utils');

const srcMain = readText('src/js/main.js');
const publicMain = readText('public/js/main.js');

function assertOverlayLabels(label, contents) {
  assert.ok(
    contents.includes('function ensureNodeLabelLayer('),
    `${label} main.js should define a persistent DOM label layer helper.`,
  );
  assert.ok(
    contents.includes('nodeLabelLayer'),
    `${label} main.js should reference the persistent node label layer.`,
  );
  assert.ok(
    contents.includes('graph2ScreenCoords'),
    `${label} main.js should project node coordinates into screen coordinates for overlay labels.`,
  );
  assert.ok(
    contents.includes('function updatePersistentNodeLabels('),
    `${label} main.js should update overlay label positions continuously.`,
  );
  assert.ok(
    contents.includes('NODE_LABEL_VERTICAL_OFFSET'),
    `${label} main.js should offset labels above nodes so text stays outside sphere centers.`,
  );
}

assertOverlayLabels('src', srcMain);
assertOverlayLabels('public', publicMain);

console.log('Verified persistent node label overlay wiring.');
