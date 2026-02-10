const { assertIncludesAll, readText } = require('./test-utils');

const viteConfig = readText('vite.config.ts');

assertIncludesAll(
  viteConfig,
  ['loadEnv', 'VITE_BASE_PATH'],
  'vite config env handling',
);

if (viteConfig.includes('process.env')) {
  throw new Error('Expected vite.config.ts to avoid direct process.env usage.');
}

console.log('Verified Vite config avoids process.env in CI builds.');
