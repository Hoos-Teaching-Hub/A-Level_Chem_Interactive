const assert = require('assert');
const { readText } = require('./test-utils');

const workflow = readText('.github/workflows/pages.yml');

assert.ok(
  workflow.includes('VITE_BASE_PATH: /A-Level_Chem_Interactive/'),
  'Expected Pages build workflow to keep VITE_BASE_PATH for repo subpath deployment.',
);

assert.ok(
  workflow.includes('VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}'),
  'Expected Pages build workflow to accept VITE_API_BASE_URL from GitHub Actions secrets.',
);

assert.ok(
  workflow.includes('VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}'),
  'Expected Pages build workflow to accept VITE_SUPABASE_URL from GitHub Actions secrets.',
);

assert.ok(
  workflow.includes('name: Validate API base URL secrets'),
  'Expected Pages build workflow to fail fast when API URL secrets are missing.',
);

assert.ok(
  workflow.includes('VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"'),
  'Expected Pages workflow validation step to normalize optional VITE_API_BASE_URL input.',
);

assert.ok(
  workflow.includes('VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}"'),
  'Expected Pages workflow validation step to normalize optional VITE_SUPABASE_URL input.',
);

assert.ok(
  workflow.includes('Both VITE_API_BASE_URL and VITE_SUPABASE_URL are empty.'),
  'Expected Pages workflow validation step to emit an actionable missing-secret error.',
);

console.log('Verified Pages workflow uses deploy-time API URL secrets.');
