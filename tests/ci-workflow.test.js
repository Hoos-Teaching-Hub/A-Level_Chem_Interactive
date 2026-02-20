const assert = require('assert');
const { readText } = require('./test-utils');

const workflow = readText('.github/workflows/tests.yml');

assert.ok(
  workflow.includes('node --test tests/*.test.js'),
  'Expected CI workflow to run all Node tests with the built-in test runner.',
);

assert.ok(
  !workflow.includes('for test_file in tests/*.test.js; do'),
  'Expected CI workflow to stop using a manual shell loop for Node tests.',
);

assert.ok(
  !workflow.includes('node tests/paths.test.js'),
  'Expected CI workflow to avoid legacy single-file Node test commands in this step.',
);

assert.ok(
  workflow.includes('deno-version: 2.6.8'),
  'Expected CI workflow to pin a Deno version that supports deno.lock version 5.',
);

assert.ok(
  !workflow.includes('deno-version: 2.1.4'),
  'Expected CI workflow to stop pinning the older Deno version that cannot read lockfile v5.',
);

assert.ok(
  !workflow.includes('retry_supabase_cmd()'),
  'Expected CI workflow to keep Supabase commands explicit without inline retry helper complexity.',
);

assert.ok(
  workflow.includes('run: supabase start'),
  'Expected CI workflow to run an explicit Supabase stack startup step.',
);

assert.ok(
  workflow.includes('run: supabase db reset'),
  'Expected CI workflow to run explicit Supabase db reset steps.',
);

assert.ok(
  workflow.includes('run: supabase db lint --level error'),
  'Expected CI workflow to keep an explicit schema lint step.',
);

assert.ok(
  workflow.includes('run: bash scripts/test-edge.sh'),
  'Expected CI workflow to run edge-function checks via scripts/test-edge.sh.',
);

console.log('Verified CI workflow uses node --test for repository Node tests.');
