const assert = require('assert');
const {
  assertDirectoryExists,
  assertFileExists,
  assertIncludesAll,
  readJson,
  readText,
} = require('./test-utils');

// This test verifies critical files, dependencies, and route wiring so
// project structure changes don't accidentally break the app shell.

// Files that must exist for the UI to render and the map surface to stay reachable.
const requiredFiles = [
  'public/organic-map.html',
  'public/js/data.js',
  'public/js/main.js',
  'public/css/styles.css',
  'src/app/router.tsx',
  'src/pages/Map.tsx',
  'src/pages/Student.tsx',
  'src/pages/Teacher.tsx',
  'src/components/JoinForm.tsx',
  'src/components/TeacherLoginForm.tsx',
  'src/validators/join.ts',
  'src/validators/teacher.ts',
];

requiredFiles.forEach((relativePath) => {
  assertFileExists(relativePath);
});

// Ensure package.json still lists core runtime dependencies.
const packageJson = readJson('package.json');

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

// Tailwind is required for styling across the app.
assert.ok(
  packageJson.devDependencies && packageJson.devDependencies.tailwindcss,
  'Expected devDependency tailwindcss in package.json.'
);

// Route definitions must include the student/teacher entry points.
const routerContents = readText('src/app/router.tsx');
assertIncludesAll(routerContents, ["path: 'student'", "path: 'teacher'", "path: 'map'"], 'router');
assertIncludesAll(
  routerContents,
  ["path: '*'", '<Navigate to="/student" replace />'],
  'router wildcard fallback',
);
assertIncludesAll(
  routerContents,
  ['basename: import.meta.env.BASE_URL', 'errorElement: <RouteError />'],
  'router basename for subpath deploys'
);

const studentPageContents = readText('src/pages/Student.tsx');
const teacherPageContents = readText('src/pages/Teacher.tsx');

assertIncludesAll(studentPageContents, ['JoinForm', 'Student access'], 'Student page');
assertIncludesAll(
  teacherPageContents,
  ['RoleGate', "blockedRoles={['student']}", 'TeacherLoginForm'],
  'Teacher page role gate'
);
assertIncludesAll(
  routerContents,
  ['RoleGuard', "blockedRoles={['student']}"],
  'Teacher route role guard'
);

// App layout should include navigation links to key routes.
const appContents = readText('src/app/App.tsx');
assertIncludesAll(appContents, ['to="/student"', 'to="/teacher"', 'to="/map"'], 'App layout');

const mapPageContents = readText('src/pages/Map.tsx');
assertIncludesAll(
  mapPageContents,
  ['iframe', 'organic-map.html'],
  'Map page embed wiring'
);

const mapHtmlContents = readText('public/organic-map.html');
assertIncludesAll(
  mapHtmlContents,
  [
    'id="viewModeBtn"',
    'id="compoundExampleStructure"',
    'id="compoundMechanismNav"',
    'overflow-y-auto',
    'sidebar-scroll',
  ],
  'Map sidebar usability additions',
);
assert.ok(
  !mapHtmlContents.includes('id="compoundClass"'),
  'Map sidebar should not render a separate class text block.',
);
assert.ok(
  mapHtmlContents.includes('3d-force-graph@1.73.1/dist/3d-force-graph.min.js'),
  'Map HTML should load the ForceGraph runtime from the expected CDN URL.',
);
assert.ok(
  !mapHtmlContents.includes('build/three.min.js'),
  'Map HTML should not hard-load a separate global THREE bundle.',
);
assert.ok(
  !mapHtmlContents.includes('three-spritetext'),
  'Map HTML should not load three-spritetext directly.',
);

const mapRuntimeContents = readText('public/js/main.js');
assertIncludesAll(
  mapRuntimeContents,
  [
    'viewModeBtn',
    'numDimensions',
    "graphViewMode === '2d'",
    'nodeRelSize',
    'setGraphViewMode',
    'applyPersistentNodeLabels',
    'TWO_D_FOCUS_DEPTH',
    'targetPosition',
    'Node click camera transition failed',
    'focus2DPosition',
    '2D node click focus failed',
    'compoundMechanismNav',
    'compoundExampleStructure',
    'CH3-CH2-CH3',
  ],
  'Map runtime example/mechanism navigation wiring',
);
assert.ok(
  !mapRuntimeContents.includes('.nodeThreeObject('),
  'Map runtime should avoid custom nodeThreeObject rendering for compatibility.',
);
assert.ok(
  !mapRuntimeContents.includes('Class:'),
  'Map runtime should not render class text in labels/tooltips.',
);
assert.ok(
  !mapRuntimeContents.includes('Chemical Compound • Class:'),
  'Compound detail header should not include class text.',
);

// Session persistence should exist in the client and be wired into route gating.
const roleStoreContents = readText('src/app/roleStore.ts');
assertIncludesAll(
  roleStoreContents,
  ['sessionStorage', 'getStoredRole', 'setStoredRole', 'useRole'],
  'Role storage module'
);

const roleGuardContents = readText('src/app/RoleGuard.tsx');
assertIncludesAll(roleGuardContents, ['useRole', 'blockedRoles'], 'Role guard wiring');

// Edge functions should remain present to support M0 auth + progress sync.
['supabase/functions/join', 'supabase/functions/load', 'supabase/functions/save', 'supabase/functions/teacher']
  .forEach((relativePath) => {
    assertDirectoryExists(relativePath);
    assertFileExists(`${relativePath}/index.ts`);
  });

console.log('Verified required files, dependencies, routes, and map assets.');
