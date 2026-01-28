const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const migrationPath = path.join(
  repoRoot,
  'supabase/migrations/20250920000100_create_m0_tables.sql'
);
const seedScriptPath = path.join(repoRoot, 'supabase/seed/seed-demo.mjs');

assert.ok(
  fs.existsSync(migrationPath),
  'Expected migration file for M0 tables to exist.'
);
assert.ok(
  fs.existsSync(seedScriptPath),
  'Expected demo seed generator to exist.'
);

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

const seedScript = fs.readFileSync(seedScriptPath, 'utf8');
['SERVER_SALT', 'sha256', 'seed-demo.sql', 'demo-codes.txt'].forEach((snippet) => {
  assert.ok(
    seedScript.includes(snippet),
    `Expected seed script to include: ${snippet}`
  );
});

console.log('Verified Supabase migration and seed generator content.');
