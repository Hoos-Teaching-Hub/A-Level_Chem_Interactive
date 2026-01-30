const assert = require('assert');
const fs = require('fs');
const path = require('path');

// This test keeps the offline-first storage contract explicit by checking
// that local/session storage keys and merge rules are encoded in the module.
const repoRoot = path.resolve(__dirname, '../..');
const storagePath = path.join(repoRoot, 'src/student/storage.ts');

assert.ok(fs.existsSync(storagePath), 'Expected student storage module to exist.');

const storageSource = fs.readFileSync(storagePath, 'utf8');

// Confirm the expected storage keys are defined for session + progress tracking.
['chem.session_token', 'chem.display_name', 'chem.teacher_code', 'chem.last_synced_at'].forEach(
  (key) => {
    assert.ok(
      storageSource.includes(key),
      `Expected storage key ${key} to be defined.`
    );
  }
);

// Confirm that teacher codes are stored in sessionStorage (not localStorage).
assert.ok(
  storageSource.includes('sessionStorage.setItem(TEACHER_CODE_KEY'),
  'Expected teacher code to be saved to sessionStorage.'
);

// Confirm local-first progress updates and merge-by-updated_at behavior.
['localStorage.setItem', 'updated_at', 'mergeProgress'].forEach((snippet) => {
  assert.ok(
    storageSource.includes(snippet),
    `Expected storage module to include ${snippet}.`
  );
});

console.log('Verified offline storage keys and merge rules.');
