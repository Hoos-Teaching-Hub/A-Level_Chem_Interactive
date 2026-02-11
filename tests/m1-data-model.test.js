const assert = require('assert');
const srcData = require('../src/js/data');
const legacyData = require('../public/legacy/js/data');
const { readText } = require('./test-utils');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const FALLBACK_NODE_TOPIC = 'Organic chemistry';
const FALLBACK_LINK_CONDITIONS = 'Structural relationship between compound classes.';
const STRUCTURE_LINK_TYPE = 'structure';
const MIN_SECTION = 1;
const MAX_SECTION = 37;

const PRIORITY_NODE_IDS = [
  'Crude',
  'Alkane',
  'Alkene',
  'Halo',
  'AlcoholGroup',
  'Alc1',
  'Alc2',
  'Ald',
  'Ket',
  'Carb',
];

const PRIORITY_LINK_KEYS = [
  'Crude|Alkane|Cracking',
  'Crude|Alkene|Cracking',
  'Alkane|Halo|Free Radical Sub',
  'Alkene|Halo|Electrophilic Add',
  'Alkene|AlcoholGroup|Hydration',
  'Halo|AlcoholGroup|Nuc Sub',
  'Halo|Alkene|Elimination',
  'Alc1|Ald|Oxidation',
  'Alc2|Ket|Oxidation',
  'Ald|Carb|Oxidation',
  'Ald|Alc1|Reduction',
  'Ket|Alc2|Reduction',
  'AlcoholGroup|Alkene|Dehydration',
];

const assertSyllabusSections = (value, message) => {
  assert.ok(Array.isArray(value) && value.length > 0, message);
  value.forEach((section) => {
    assert.ok(Number.isInteger(section), `${message} section "${section}" must be an integer.`);
    assert.ok(
      section >= MIN_SECTION && section <= MAX_SECTION,
      `${message} section "${section}" must be in ${MIN_SECTION}-${MAX_SECTION}.`,
    );
  });
  assert.strictEqual(new Set(value).size, value.length, `${message} must not contain duplicates.`);
};

const assertNodeMetadata = (node, label) => {
  assert.ok(
    node.level === 'AS' || node.level === 'A2',
    `${label} node "${node.id}" must include level (AS/A2).`,
  );
  assert.ok(isNonEmptyString(node.topic), `${label} node "${node.id}" must include topic.`);
  assert.notStrictEqual(
    node.topic,
    FALLBACK_NODE_TOPIC,
    `${label} node "${node.id}" still uses fallback topic.`,
  );
  assert.ok(
    Array.isArray(node.examTips) && node.examTips.length > 0,
    `${label} node "${node.id}" must include examTips array.`,
  );
  assert.ok(
    node.examTips.every(isNonEmptyString),
    `${label} node "${node.id}" has invalid examTips entries.`,
  );
  assertSyllabusSections(
    node.syllabusSections,
    `${label} node "${node.id}" must include syllabusSections.`,
  );
};

const assertLinkMetadata = (link, label) => {
  assert.ok(
    isNonEmptyString(link.reagents),
    `${label} link "${link.source}->${link.target}" must include reagents.`,
  );
  assert.ok(
    isNonEmptyString(link.conditions),
    `${label} link "${link.source}->${link.target}" must include conditions.`,
  );
  assert.ok(
    isNonEmptyString(link.mechanismSummary),
    `${label} link "${link.source}->${link.target}" must include mechanismSummary.`,
  );
  assertSyllabusSections(
    link.syllabusSections,
    `${label} link "${link.source}->${link.target}" must include syllabusSections.`,
  );

  if (link.type === STRUCTURE_LINK_TYPE) {
    return;
  }

  const validQuiz =
    link.quizData &&
    isNonEmptyString(link.quizData.prompt) &&
    Array.isArray(link.quizData.hiddenFields) &&
    link.quizData.hiddenFields.length > 0 &&
    link.quizData.hiddenFields.every(isNonEmptyString) &&
    isNonEmptyString(link.quizData.answer);

  assert.notStrictEqual(
    link.conditions,
    FALLBACK_LINK_CONDITIONS,
    `${label} link "${link.source}->${link.target}" still uses fallback conditions.`,
  );
  assert.notStrictEqual(
    link.mechanismSummary,
    link.type,
    `${label} link "${link.source}->${link.target}" still uses fallback mechanism summary.`,
  );
  assert.ok(validQuiz, `${label} link "${link.source}->${link.target}" must include valid quizData.`);
  assert.ok(
    isNonEmptyString(link.animationId),
    `${label} link "${link.source}->${link.target}" must include animationId.`,
  );
};

const assertNoOrphans = (gData, label) => {
  const connected = new Set();
  gData.links.forEach((link) => {
    connected.add(link.source);
    connected.add(link.target);
  });

  gData.nodes.forEach((node) => {
    assert.ok(connected.has(node.id), `${label} node "${node.id}" is orphaned.`);
  });
};

const getLinkKey = (link) => `${link.source}|${link.target}|${link.label}`;

const assertPriorityMetadataCoverage = (gData, label) => {
  const nodesById = new Map(gData.nodes.map((node) => [node.id, node]));
  PRIORITY_NODE_IDS.forEach((id) => {
    const node = nodesById.get(id);
    assert.ok(node, `${label} is missing priority node "${id}".`);
  });

  const linksByKey = new Map(gData.links.map((link) => [getLinkKey(link), link]));
  PRIORITY_LINK_KEYS.forEach((key) => {
    const link = linksByKey.get(key);
    assert.ok(link, `${label} is missing priority link "${key}".`);
  });
};

const datasets = [
  ['src', srcData.gData],
  ['legacy', legacyData.gData],
];

datasets.forEach(([label, gData]) => {
  gData.nodes.forEach((node) => assertNodeMetadata(node, label));
  gData.links.forEach((link) => assertLinkMetadata(link, label));
  assertNoOrphans(gData, label);
  assertPriorityMetadataCoverage(gData, label);
});

const srcNodeIds = new Set(srcData.gData.nodes.map((node) => node.id));
const legacyNodeIds = new Set(legacyData.gData.nodes.map((node) => node.id));
assert.deepStrictEqual(
  Array.from(srcNodeIds).sort(),
  Array.from(legacyNodeIds).sort(),
  'src and legacy node sets should stay aligned.',
);

const srcLinkKeys = new Set(srcData.gData.links.map((link) => getLinkKey(link)));
const legacyLinkKeys = new Set(legacyData.gData.links.map((link) => getLinkKey(link)));
assert.deepStrictEqual(
  Array.from(srcLinkKeys).sort(),
  Array.from(legacyLinkKeys).sort(),
  'src and legacy link sets should stay aligned.',
);

const reactionLinks = srcData.gData.links.filter((link) => link.type !== STRUCTURE_LINK_TYPE);
const reactionAnimationIds = reactionLinks.map((link) => link.animationId);
assert.strictEqual(
  new Set(reactionAnimationIds).size,
  reactionAnimationIds.length,
  'Expected reaction links to use unique animationId values.',
);

const mapHtml = readText('public/legacy/organic-map.html');
['infoWhat', 'infoHow', 'infoWhy', 'infoExamTip'].forEach((id) => {
  assert.ok(
    mapHtml.includes(`id="${id}"`),
    `Expected legacy map panel block with id "${id}".`,
  );
});

console.log('Verified M1 metadata schema, orphan-node checks, and info panel blocks.');
