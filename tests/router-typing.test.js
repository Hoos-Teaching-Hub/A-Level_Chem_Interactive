const { assertIncludesAll, readText } = require('./test-utils');

const routerContents = readText('src/app/router.tsx');

assertIncludesAll(
  routerContents,
  ['const router: ReturnType<typeof createBrowserRouter>'],
  'router type annotation',
);

console.log('Verified router has explicit return type annotation.');
