const { assertFileExists, assertIncludesAll, readText } = require('./test-utils');

const standardPath = 'docs/m2-animation-standard.md';
assertFileExists(standardPath);

const standard = readText(standardPath);

assertIncludesAll(
  standard,
  [
    '# M2 Animation Standard',
    '## 1) Fidelity Tiers',
    '## 2) Visual Rules',
    '## 3) Pedagogy Rules',
    '## 4) Data Contract',
    '## 5) QA Gates',
    '## 6) Delivery Plan',
  ],
  'M2 animation standard sections',
);

assertIncludesAll(
  standard,
  [
    '`animationId`',
    '`durationMs`',
    '`steps`',
    'atoms',
    'bonds',
    'dipole',
    'lone pair',
    'electron movement',
    'fallback',
    'manual acceptance checklist',
  ],
  'M2 animation standard required constraints',
);

const readme = readText('README.md');
assertIncludesAll(
  readme,
  ['docs/m2-animation-standard.md'],
  'README M2 animation standard reference',
);

console.log('Verified M2 animation standard documentation and README linkage.');
