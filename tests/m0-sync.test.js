const {
  assertFileExists,
  assertIncludesAll,
  readText,
} = require('./test-utils');

const requiredFiles = [
  'src/api/session.ts',
  'src/api/progress.ts',
  'src/api/sync.ts',
];

requiredFiles.forEach((relativePath) => {
  assertFileExists(relativePath);
});

const clientContents = readText('src/api/client.ts');
assertIncludesAll(
  clientContents,
  ['loadProgress', 'saveProgress', 'getTeacherReport'],
  'api client'
);

const sessionContents = readText('src/api/session.ts');
assertIncludesAll(
  sessionContents,
  ['chem.sessionToken', 'chem.studentProfile', 'chem.teacherCode', 'chem.teacherClassCode'],
  'session storage'
);

const progressContents = readText('src/api/progress.ts');
assertIncludesAll(
  progressContents,
  ['chem.progress', 'chem.lastSyncAt'],
  'progress storage'
);

console.log('Verified offline sync helpers and storage keys.');
