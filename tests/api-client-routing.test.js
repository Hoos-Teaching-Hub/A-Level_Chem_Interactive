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
  clientContents.includes('canRetryWithFunctionsPrefix && response.status === 404'),
  'Expected api client to retry host-root base URLs on any 404 response.',
);

const retrySection = clientContents
  .slice(
    clientContents.indexOf('const shouldRetryWithFunctionsPrefix'),
    clientContents.indexOf('export async function getJson'),
  );
assert.ok(
  !retrySection.includes('!isJsonContentType(response)'),
  'Expected 404 retry logic to work even when gateway returns JSON for missing routes.',
);

assert.ok(
  clientContents.includes('Check VITE_API_BASE_URL'),
  'Expected api client to provide actionable endpoint configuration guidance for 404 errors.',
);

assert.ok(
  clientContents.includes('Set VITE_API_BASE_URL or VITE_SUPABASE_URL in .env.local'),
  'Expected api client to explain how to configure frontend env vars when API base URL is missing.',
);

assert.ok(
  clientContents.includes('Could not reach the API server'),
  'Expected api client to provide connectivity guidance when fetch cannot reach local functions.',
);

console.log('Verified API client route fallback and endpoint error guidance wiring.');
