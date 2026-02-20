const assert = require('assert');
const { readText } = require('./test-utils');

const edgeScript = readText('scripts/test-edge.sh');

assert.ok(
  edgeScript.includes('retry_supabase_cmd()'),
  'Expected edge test script to define a retry helper for transient Supabase startup failures.',
);

assert.ok(
  edgeScript.includes('supabase stop --no-backup >/dev/null 2>&1 || true'),
  'Expected edge test script to clean up stale Supabase containers before retries.',
);

assert.ok(
  edgeScript.includes('retry_supabase_cmd "supabase start" supabase start'),
  'Expected edge test script to retry Supabase startup before running tests.',
);

console.log('Verified edge test script retries and cleanup guards.');
