const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

const requiredFiles = [
  'public/legacy/index.html',
  'public/legacy/organic-map.html',
  'public/legacy/js/data.js',
  'src/app/router.tsx',
  'src/pages/Student.tsx',
  'src/pages/Teacher.tsx',
  'src/student/StudentJoinForm.tsx',
  'src/components/TeacherLoginForm.tsx',
  'src/student/ActivityList.tsx',
  'src/student/ActivityPage.tsx',
  'src/student/StudentStatusBar.tsx',
  'src/student/activities.ts',
  'src/student/storage.ts',
  'src/validators/join.ts',
  'src/validators/teacher.ts',
];

requiredFiles.forEach((relativePath) => {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `Expected ${relativePath} to exist.`);
});

const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
);

const expectedDependencies = [
  'react',
  'react-dom',
  'react-router-dom',
  '@tanstack/react-query',
  'zod',
];

expectedDependencies.forEach((dep) => {
  assert.ok(
    packageJson.dependencies && packageJson.dependencies[dep],
    `Expected dependency ${dep} in package.json.`
  );
});

assert.ok(
  packageJson.devDependencies && packageJson.devDependencies.tailwindcss,
  'Expected devDependency tailwindcss in package.json.'
);

const routerContents = fs.readFileSync(
  path.join(repoRoot, 'src/app/router.tsx'),
  'utf8'
);

["path: 'student'", "path: 'teacher'"].forEach((snippet) => {
  assert.ok(
    routerContents.includes(snippet),
    `Expected router to include ${snippet}.`
  );
});

const appContents = fs.readFileSync(
  path.join(repoRoot, 'src/app/App.tsx'),
  'utf8'
);

['to="/student"', 'to="/teacher"'].forEach((snippet) => {
  assert.ok(
    appContents.includes(snippet),
    `Expected App layout to include ${snippet}.`
  );
});

const legacyIndex = fs.readFileSync(
  path.join(repoRoot, 'public/legacy/index.html'),
  'utf8'
);

assert.ok(
  legacyIndex.includes('A-Level Chemistry Interactive'),
  'Expected legacy index to preserve the title.'
);
assert.ok(
  legacyIndex.includes('organic-map.html'),
  'Expected legacy index to link to organic map.'
);

console.log('Verified required files, dependencies, routes, and legacy assets.');
