const { assertFileExists, assertIncludesAll, readJson, readText } = require('./test-utils');

const packageJson = readJson('package.json');

const visualScript = packageJson.scripts?.['test:visual'];
if (typeof visualScript !== 'string') {
  throw new Error('Expected package.json scripts.test:visual to exist.');
}

assertIncludesAll(
  visualScript,
  [
    'npm run build',
    'node scripts/visual-smoke.js',
  ],
  'test:visual script',
);

assertFileExists('scripts/visual-smoke.js');
const visualRunner = readText('scripts/visual-smoke.js');
assertIncludesAll(
  visualRunner,
  [
    'require(\'playwright\')',
    '/organic-map.html',
    'artifacts/visual',
    'page.screenshot',
  ],
  'visual smoke runner',
);

const readme = readText('README.md');
assertIncludesAll(
  readme,
  ['npm run test:visual'],
  'README visual smoke documentation',
);

console.log('Verified visual smoke test wiring and documentation.');
