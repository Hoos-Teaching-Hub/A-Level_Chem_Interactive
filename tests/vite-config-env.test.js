const assert = require('assert');
const { readText } = require('./test-utils');

const viteConfig = readText('vite.config.ts');

assert.ok(
  viteConfig.includes('loadEnv'),
  'Expected vite.config.ts to use Vite loadEnv for config-time env variables.',
);

assert.ok(
  viteConfig.includes("const env = loadEnv(mode, '', '')"),
  'Expected vite.config.ts to load env values for the current mode without Node globals.',
);

assert.ok(
  !/\bprocess\./.test(viteConfig),
  'Expected vite.config.ts to avoid process globals to keep CI TypeScript checks Node-typing free.',
);

assert.ok(
  viteConfig.includes("mode === 'production' ? env.VITE_BASE_PATH || '/' : '/'"),
  'Expected production base path to come from VITE_BASE_PATH with "/" fallback.',
);

console.log('Verified Vite config uses loadEnv-based base path resolution.');
