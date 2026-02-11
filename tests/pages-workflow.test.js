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

console.log('Verified Pages workflow uses deploy-time API URL secrets.');
