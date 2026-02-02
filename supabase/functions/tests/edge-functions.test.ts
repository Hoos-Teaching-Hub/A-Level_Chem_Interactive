// Legacy entrypoint preserved for compatibility. It now forwards to the new
// unit + integration suites so existing tooling can still invoke a single file.
import "./unit/hash.test.ts";
import "./unit/validators.test.ts";
import "./integration/join.test.ts";
import "./integration/save-load.test.ts";
import "./integration/teacher-report.test.ts";
import "./integration/isolation.test.ts";
import "./integration/access-control.test.ts";
