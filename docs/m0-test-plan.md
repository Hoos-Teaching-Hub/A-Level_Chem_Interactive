# M0 Test Plan (Frontend API Client + Student MVP)

This plan aligns with the M0 roadmap (T4/T5) and prioritizes offline-first behavior, sync reliability,
student progress integrity, and teacher-code storage rules.

## 1) Core validation goals

### 1.1 API client
- **Timeouts**: requests abort after the configured timeout and surface actionable errors.
- **Retries**: transient failures (network/5xx/408) retry with backoff and eventually fail cleanly.
- **Auth headers**: requests include `Authorization: Bearer <session_token>` when required.

### 1.2 Student sync lifecycle
- **Join**: `session_token` stored in `localStorage` on success; offline fallback keeps local progress usable.
- **Local-first writes**: activity updates persist to `localStorage` before network sync.
- **Manual retry**: failed saves show the “本机已保存” warning and allow a retry.
- **Merge logic**: server data overwrites local progress only when `updated_at` is newer.

### 1.3 Teacher flow
- **Teacher code**: stored in `sessionStorage` only and cleared on tab close.

## 2) Test coverage plan

### 2.1 Unit tests
- **API client**: simulate timeouts, retries, and non-200 responses.
- **Storage utilities**: read/write operations, `updated_at` merge rules, pending updates.

### 2.2 Component tests
- **Join form**: validation errors and offline fallback messaging.
- **Activity page**: answer selection updates local state and triggers save.
- **Status bar**: renders correct student name + sync status + last synced time.

### 2.3 Integration tests
- **Local-first sync**: load local progress, attempt save, recover after retry.
- **Cross-device**: load remote progress; verify latest update wins after merge.
- **Teacher code persistence**: data exists in sessionStorage only.

### 2.4 Manual QA checklist
1. Disable backend → join student → answer questions → refresh → progress still present.
2. Enable backend → rejoin → load progress merges with local; latest wins by timestamp.
3. Disable network while answering → error banner appears; retry succeeds after reconnect.

## 3) Proposed test re-organization (awaiting approval)

If approved, reorganize tests under:

```
tests/
  unit/
  integration/
  ui/
```

This will make it easier to map each test to the M0 roadmap requirements and QA plan.
