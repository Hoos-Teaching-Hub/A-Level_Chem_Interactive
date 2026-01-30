const assert = require('assert');
const fs = require('fs');
const path = require('path');

// This test validates that the API client includes the core safety features
// required by the M0 offline-first plan (timeouts, retries, and auth headers).
const repoRoot = path.resolve(__dirname, '../..');
const apiClientPath = path.join(repoRoot, 'src/api/api.ts');

assert.ok(fs.existsSync(apiClientPath), 'Expected api client module to exist.');

const apiClientSource = fs.readFileSync(apiClientPath, 'utf8');

// Ensure timeout + retry defaults remain present for resilient fetch behavior.
['DEFAULT_TIMEOUT_MS', 'DEFAULT_RETRIES', 'fetchWithTimeout', 'shouldRetry'].forEach(
  (snippet) => {
    assert.ok(
      apiClientSource.includes(snippet),
      `Expected api client to include ${snippet}.`
    );
  }
);

// Ensure auth header handling is present for session-based calls.
['Authorization', 'Bearer', 'getAuthHeaders'].forEach((snippet) => {
  assert.ok(
    apiClientSource.includes(snippet),
    `Expected api client to include auth helper ${snippet}.`
  );
});

// Ensure required endpoints are wired in the client wrapper.
['/join', '/load', '/save', '/teacher/report'].forEach((endpoint) => {
  assert.ok(
    apiClientSource.includes(endpoint),
    `Expected api client to call ${endpoint}.`
  );
});

console.log('Verified API client timeout/retry/auth configuration.');
