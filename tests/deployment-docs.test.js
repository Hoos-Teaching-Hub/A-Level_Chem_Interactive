const { assertFileExists, assertIncludesAll, readText } = require('./test-utils');

const requiredFiles = [
  'docs/deployment.md',
  '.github/workflows/pages.yml',
];

requiredFiles.forEach((relativePath) => {
  assertFileExists(relativePath);
});

const readme = readText('README.md');
assertIncludesAll(
  readme,
  ['Deployment', 'docs/deployment.md'],
  'README deployment section',
);

const deploymentDoc = readText('docs/deployment.md');
assertIncludesAll(
  deploymentDoc,
  ['Local deployment', 'GitHub Pages test deployment', 'Production deployment'],
  'deployment guide sections',
);

console.log('Verified deployment documentation and Pages workflow.');
