const { assertIncludesAll, readText } = require('./test-utils');

const activitiesContents = readText('src/student/mockActivities.ts');
assertIncludesAll(
  activitiesContents,
  ['level', 'metadata', 'what', 'how', 'why', 'examTip'],
  'M1 metadata model',
);

const dashboardContents = readText('src/student/StudentDashboard.tsx');
assertIncludesAll(
  dashboardContents,
  ['What', 'How', 'Why', 'Exam tip'],
  'M1 metadata panel',
);

console.log('Verified M1 metadata model and What/How/Why/Exam tip panel.');
