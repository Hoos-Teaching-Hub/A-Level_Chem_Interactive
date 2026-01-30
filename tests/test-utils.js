const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const resolveRepoPath = (...parts) => path.join(repoRoot, ...parts);

const readText = (relativePath) => {
  const fullPath = resolveRepoPath(relativePath);
  return fs.readFileSync(fullPath, 'utf8');
};

const readJson = (relativePath) => JSON.parse(readText(relativePath));

const assertFileExists = (relativePath) => {
  const fullPath = resolveRepoPath(relativePath);
  assert.ok(fs.existsSync(fullPath), `Expected ${relativePath} to exist.`);
  return fullPath;
};

const assertDirectoryExists = (relativePath) => {
  const fullPath = resolveRepoPath(relativePath);
  assert.ok(fs.existsSync(fullPath), `Expected ${relativePath} to exist.`);
  assert.ok(
    fs.statSync(fullPath).isDirectory(),
    `Expected ${relativePath} to be a directory.`
  );
  return fullPath;
};

const assertIncludesAll = (source, snippets, label) => {
  snippets.forEach((snippet) => {
    assert.ok(
      source.includes(snippet),
      `Expected ${label} to include: ${snippet}`
    );
  });
};

module.exports = {
  assertDirectoryExists,
  assertFileExists,
  assertIncludesAll,
  readJson,
  readText,
  resolveRepoPath,
};
