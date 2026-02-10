const { assertFileExists, assertIncludesAll, readText } = require('./test-utils');

const requiredFiles = [
  'src/teacher/TeacherDashboard.tsx',
  'src/teacher/teacherCsv.ts',
];

requiredFiles.forEach((relativePath) => {
  assertFileExists(relativePath);
});

const teacherPageContents = readText('src/pages/Teacher.tsx');
assertIncludesAll(
  teacherPageContents,
  ['TeacherDashboard', 'TeacherLoginForm', 'getTeacherCode', 'getTeacherClassCode'],
  'Teacher page dashboard gating',
);

const dashboardContents = readText('src/teacher/TeacherDashboard.tsx');
assertIncludesAll(
  dashboardContents,
  ['Leaderboard', 'Activity distribution', 'Export CSV', 'Search students'],
  'Teacher dashboard UI',
);

const loginFormContents = readText('src/components/TeacherLoginForm.tsx');
assertIncludesAll(
  loginFormContents,
  ['setTeacherCode', 'setTeacherClassCode'],
  'Teacher login storage',
);

console.log('Verified teacher dashboard wiring and CSV export UI.');
