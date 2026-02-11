const { assertIncludesAll, readJson, readText } = require('./test-utils');

const packageJson = readJson('package.json');

const verifyLocalScript = packageJson.scripts?.['verify:local'];
if (typeof verifyLocalScript !== 'string') {
  throw new Error('Expected package.json scripts.verify:local to exist.');
}

assertIncludesAll(
  verifyLocalScript,
  [
    'node tests/paths.test.js',
    'npm run build',
    'bash scripts/test-edge.sh',
  ],
  'verify:local script',
);

const readme = readText('README.md');
assertIncludesAll(readme, ['npm run verify:local'], 'README local verification docs');

console.log('Verified local verification script and documentation.');
