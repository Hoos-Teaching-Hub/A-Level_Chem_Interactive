const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// This test enforces the existence and critical content of Supabase migration
// and seed scripts so database setup doesn't drift from the backend code.
const repoRoot = path.resolve(__dirname, '..');

// Keep paths explicit so renames are caught by tests.
const migrationPath = path.join(
  repoRoot,
  'supabase/migrations/20250920000100_create_m0_tables.sql'
);
const seedScriptPath = path.join(repoRoot, 'supabase/seed/seed-demo.mjs');

// Ensure key files exist.
assert.ok(
  fs.existsSync(migrationPath),
  'Expected migration file for M0 tables to exist.'
);
assert.ok(
  fs.existsSync(seedScriptPath),
  'Expected demo seed generator to exist.'
);

// Validate SQL fragments so the schema keeps its security-critical columns.
const migrationSql = fs.readFileSync(migrationPath, 'utf8');
[
  'create table if not exists classes',
  'teacher_code_hash',
  'create table if not exists students',
  'student_code_hash',
  'create table if not exists sessions',
  'token_hash',
  'create table if not exists progress',
  'primary key (student_id, activity_id)',
].forEach((snippet) => {
  assert.ok(
    migrationSql.includes(snippet),
    `Expected migration to include: ${snippet}`
  );
});

[
  'class_code text not null references classes(class_code)',
  'student_code_hash text not null',
  'create unique index if not exists students_class_code_student_code_hash_key',
  'token_hash text primary key',
  'expires_at timestamptz not null',
  'student_id uuid not null references students(id)',
  'primary key (student_id, activity_id)',
].forEach((snippet) => {
  assert.ok(
    migrationSql.includes(snippet),
    `Expected migration to enforce: ${snippet}`
  );
});

// Verify the seed generator includes hashing and writes the correct artifacts.
const seedScript = fs.readFileSync(seedScriptPath, 'utf8');
['SERVER_SALT', 'sha256', 'seed-demo.sql', 'demo-codes.txt'].forEach((snippet) => {
  assert.ok(
    seedScript.includes(snippet),
    `Expected seed script to include: ${snippet}`
  );
});

assert.ok(
  seedScript.includes("digest('hex')"),
  'Expected seed script to store SHA-256 hashes as hex.'
);

// Quick sanity check: SHA-256 hex digests are always 64 characters.
const hashSample = crypto
  .createHash('sha256')
  .update('hash-sample')
  .digest('hex');

assert.ok(
  /^[a-f0-9]{64}$/.test(hashSample),
  'Expected SHA-256 hex digest to be 64 characters.'
);

console.log('Verified Supabase migration and seed generator content.');
