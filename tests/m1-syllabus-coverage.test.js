const assert = require('assert');
const srcData = require('../src/js/data');
const legacyData = require('../public/legacy/js/data');

const M1_AS_TARGET_SECTIONS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const M1_A2_TARGET_SECTIONS = [29, 30, 31, 32, 33, 34, 35, 36, 37];
const REQUIRED_M1_SECTIONS = [...M1_AS_TARGET_SECTIONS, ...M1_A2_TARGET_SECTIONS];

const TOPIC_SECTION_EXPECTATIONS = {
  Hydrocarbons: [14, 30],
  'Halogen compounds': [15, 31],
  'Hydroxy compounds': [16, 32],
  'Carbonyl compounds': [17],
  'Carboxylic acids and derivatives': [18, 33],
  'Nitrogen compounds': [19, 34],
  Polymerisation: [20, 35],
  'Reaction limits': [21, 36],
};

const hasAnySection = (taggedSections, expectedSections) =>
  expectedSections.some((section) => taggedSections.includes(section));

const collectSectionSet = (gData) =>
  new Set([...gData.nodes, ...gData.links].flatMap((item) => item.syllabusSections || []));

const assertLevelCompatibility = (node, label) => {
  if (node.level === 'AS') {
    assert.ok(
      node.syllabusSections.some((section) => section <= 22),
      `${label} AS node "${node.id}" must include at least one AS section tag.`,
    );
  }

  if (node.level === 'A2') {
    assert.ok(
      node.syllabusSections.some((section) => section >= 23),
      `${label} A2 node "${node.id}" must include at least one A2 section tag.`,
    );
  }
};

const assertTopicCoherence = (node, label) => {
  const expectedSections = TOPIC_SECTION_EXPECTATIONS[node.topic];
  if (!expectedSections) {
    return;
  }

  assert.ok(
    hasAnySection(node.syllabusSections, expectedSections),
    `${label} node "${node.id}" topic "${node.topic}" must include one of sections: ${expectedSections.join(
      ', ',
    )}.`,
  );
};

const assertCoverageTargets = (gData, label) => {
  const sectionSet = collectSectionSet(gData);
  REQUIRED_M1_SECTIONS.forEach((section) => {
    assert.ok(sectionSet.has(section), `${label} data is missing section ${section} coverage.`);
  });
};

const datasets = [
  ['src', srcData.gData],
  ['legacy', legacyData.gData],
];

datasets.forEach(([label, gData]) => {
  gData.nodes.forEach((node) => {
    assertLevelCompatibility(node, label);
    assertTopicCoherence(node, label);
  });
  assertCoverageTargets(gData, label);
});

const srcSectionSet = collectSectionSet(srcData.gData);
const legacySectionSet = collectSectionSet(legacyData.gData);
assert.deepStrictEqual(
  Array.from(srcSectionSet).sort((a, b) => a - b),
  Array.from(legacySectionSet).sort((a, b) => a - b),
  'Expected src and legacy datasets to expose the same syllabus section coverage.',
);

console.log('Verified M1 syllabus tagging and section coverage targets.');
