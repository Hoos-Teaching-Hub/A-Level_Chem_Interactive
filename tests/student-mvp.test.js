const { assertFileExists, assertIncludesAll, readText } = require('./test-utils');

const requiredFiles = [
  'src/student/mockActivities.ts',
  'src/student/StudentDashboard.tsx',
  'src/student/StudentStatusBar.tsx',
];

requiredFiles.forEach((relativePath) => {
  assertFileExists(relativePath);
});

const studentPage = readText('src/pages/Student.tsx');
assertIncludesAll(
  studentPage,
  ['StudentDashboard', 'JoinForm', 'getSessionToken', 'getStudentProfile'],
  'Student page gating',
);

const dashboardContents = readText('src/student/StudentDashboard.tsx');
assertIncludesAll(
  dashboardContents,
  ['mockActivities', 'StudentStatusBar', 'queueProgressUpdate', 'Activity focus', 'to="/map"', 'Jump to map'],
  'Student dashboard',
);

const statusContents = readText('src/student/StudentStatusBar.tsx');
assertIncludesAll(
  statusContents,
  ['Sync now', 'Last sync', 'Pending updates'],
  'Student status bar',
);

console.log('Verified Student MVP dashboard wiring and status bar.');
