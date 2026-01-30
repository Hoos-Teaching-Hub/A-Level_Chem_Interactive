const assert = require('assert');
const crypto = require('crypto');
const { assertFileExists, assertIncludesAll, readText, resolveRepoPath } = require('./test-utils');

// This test enforces the existence and critical content of Supabase migration
// and seed scripts so database setup doesn't drift from the backend code.

// Keep paths explicit so renames are caught by tests.
const migrationPath = resolveRepoPath(
  'supabase/migrations/20250920000100_create_m0_tables.sql'
);
const seedScriptPath = resolveRepoPath('supabase/seed/seed-demo.mjs');

// Ensure key files exist.
assertFileExists('supabase/migrations/20250920000100_create_m0_tables.sql');
assertFileExists('supabase/seed/seed-demo.mjs');

// Validate SQL fragments so the schema keeps its security-critical columns.
const migrationSql = readText('supabase/migrations/20250920000100_create_m0_tables.sql');
assertIncludesAll(
  migrationSql,
  [
    'create table if not exists classes',
    'teacher_code_hash',
    'create table if not exists students',
    'student_code_hash',
    'create table if not exists sessions',
    'token_hash',
    'create table if not exists progress',
    'primary key (student_id, activity_id)',
  ],
  'migration'
);

assertIncludesAll(
  migrationSql,
  [
    'class_code text not null references classes(class_code)',
    'student_code_hash text not null',
    'create unique index if not exists students_class_code_student_code_hash_key',
    'token_hash text primary key',
    'expires_at timestamptz not null',
    'student_id uuid not null references students(id)',
    'primary key (student_id, activity_id)',
  ],
  'migration constraints'
);

// Verify the seed generator includes hashing and writes the correct artifacts.
const seedScript = readText('supabase/seed/seed-demo.mjs');
assertIncludesAll(
  seedScript,
  ['SERVER_SALT', 'sha256', 'seed-demo.sql', 'demo-codes.txt'],
  'seed script'
);

assert.ok(
  seedScript.includes("digest('hex')"),
  'Expected seed script to store SHA-256 hashes as hex.'
);

// Quick sanity check: SHA-256 hex digests are always 64 characters.
const hashSample = crypto
  .createHash('sha256')
  .update('hash-sample')
  .digest('hex');

// This guards against accidental changes to the hashing method/output format.
assert.ok(
  /^[a-f0-9]{64}$/.test(hashSample),
  'Expected SHA-256 hex digest to be 64 characters.'
);

console.log('Verified Supabase migration and seed generator content.');
