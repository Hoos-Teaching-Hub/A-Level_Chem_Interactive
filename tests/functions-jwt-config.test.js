const assert = require('assert');
const { readText } = require('./test-utils');

const config = readText('supabase/config.toml');

const expectNoJwt = (functionName) => {
  const blockPattern = new RegExp(
    `\\[functions\\.${functionName}\\][\\s\\S]*?verify_jwt\\s*=\\s*false`,
  );
  assert.ok(
    blockPattern.test(config),
    `Expected supabase/config.toml to disable JWT verification for function "${functionName}".`,
  );
};

expectNoJwt('join');
expectNoJwt('load');
expectNoJwt('save');
expectNoJwt('teacher');

console.log('Verified per-function JWT verification settings for custom-auth edge functions.');
