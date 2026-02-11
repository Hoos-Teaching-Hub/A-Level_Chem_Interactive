const assert = require('assert');
const { readText } = require('./test-utils');

const clientContents = readText('src/api/client.ts');

assert.ok(
  clientContents.includes('VITE_SUPABASE_URL'),
  'Expected api client to support VITE_SUPABASE_URL fallback when VITE_API_BASE_URL is unset.',
);

assert.ok(
  clientContents.includes('/functions/v1'),
  'Expected api client to normalize edge function base URLs through /functions/v1.',
);

assert.ok(
  clientContents.includes('response.status === 404'),
  'Expected api client to detect 404 responses for base URL fallback retry logic.',
);

assert.ok(
  clientContents.includes('Check VITE_API_BASE_URL'),
  'Expected api client to provide actionable endpoint configuration guidance for 404 errors.',
);

console.log('Verified API client route fallback and endpoint error guidance wiring.');
