# PostgreSQL Public Stats Real-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep HomeHeroSection metrics and public form response/view counters current after committed application or SQL writes without a page reload.

**Architecture:** PostgreSQL triggers own `forms.response_count` and publish sanitized `NOTIFY` invalidations after commits. Each backend instance uses a dedicated reconnectable `pg.Client` listener and forwards events through the existing public SSE channel; the browser refreshes immediately and polls only while SSE is unavailable.

**Tech Stack:** Node.js ESM, PostgreSQL, `pg`, Express SSE, React hooks, Node built-in `node:test`.

**Spec:** [../specs/2026-11-24-postgres-public-stats-realtime-design.md](../specs/2026-11-24-postgres-public-stats-realtime-design.md)

## Global Constraints

- PostgreSQL delivers `NOTIFY` after the transaction commits; payloads are generic invalidations without form IDs, responses, personal data, or row values.
- `response_count` is derived from `responses`; only database triggers maintain it.
- The client has no intentional 300 ms debounce; the 10-second polling fallback runs only while SSE is unavailable.
- The listener uses a persistent PostgreSQL session; a transaction-mode pooler is not supported for `LISTEN`.
- Listener errors are logged, reconnect uses capped backoff, and SSE is not reported healthy while its listener is unavailable.
- PostgreSQL integration tests require an isolated disposable database selected explicitly by `PUBLIC_STATS_TEST_DATABASE_URL`; never write tests to the application's `DATABASE_URL`.
- Trigger activation must not overlap with old backend instances that still modify response counts manually.
- A form is eligible for public invalidations only when `status` is `published`, `visible`, or `publico`, `is_archived = false`, and `visibility` is neither `private` nor `unlisted`.
- Preserve the pre-existing dirty worktree. Stage only changes made by the current task; do not include unrelated modifications or probe files in commits.

## Review Focus

- **SQL insert/delete/move, including concurrent inserts:** each operation changes the affected form counters exactly once; pin in Task 1 integration tests.
- **Transaction rollback:** rolled-back changes neither alter the counter nor produce a deliverable notification; pin in Task 1 integration tests.
- **Public-to-private, unpublish, or archive transitions:** clients receive an invalidation so removed forms disappear, while records that remain private/unlisted/draft do not notify; pin in Task 1 trigger tests.
- **Listener loss while SSE clients are connected:** clients are disconnected, the endpoint reports unavailable, and reconnect restores a current snapshot; pin in Task 2 tests.
- **Bursts and SSE recovery in the browser:** each event causes immediate silent refresh, no 300 ms timer remains, and recovery stops fallback polling; pin in Task 3 tests.

---

## File Map

- `backend/db/migrations/publicStatsNotifications.js` — transactionally install the counter and public invalidation triggers, perform a one-time count reconciliation, and record the migration version.
- `backend/config/db.js` — invoke the migration after the base `forms` and `responses` schema exists.
- `backend/repositories/form.repo.js` — remove application counter writes; retain view writes and make seed counter updates views-only.
- `backend/services/response.service.js` — remove manual response-count deltas and public in-memory invalidations while keeping authenticated analytics events.
- `backend/utils/seed.js` — seed response rows first and set only view counts.
- `backend/qa/public-stats-db.test.js` — exercise trigger behavior and commit/rollback notification semantics against an isolated PostgreSQL test database.
- `backend/services/publicStatsDbListener.js` — own the dedicated PostgreSQL listener, readiness state, reconnect loop, and shutdown.
- `backend/services/realtimeStats.js` — close public SSE clients on listener loss and retain the existing authenticated channels.
- `backend/controllers/response.controller.js` — reject public stream connections with `503` while the database listener is unavailable.
- `backend/server.js` — start the listener after migrations/bootstrap and stop it during process shutdown.
- `backend/qa/public-stats-db-listener.test.js` — test listener startup, notification forwarding, readiness, disconnect, reconnect, and cleanup.
- `frontend/AIFormBuilder/src/lib/publicStatsConnection.js` — implement a dependency-injected, testable shared EventSource/fallback manager.
- `frontend/AIFormBuilder/src/hooks/publicStatsUpdates.js` — instantiate the connection manager for `/events/public-stats`.
- `frontend/AIFormBuilder/qa/public-stats-connection.test.js` — test immediate delivery, fallback transitions, reconnect refresh, and unsubscribe cleanup.

## Task 1: Make PostgreSQL the Counter and Change Source

**Files:**
- Create: `backend/db/migrations/publicStatsNotifications.js`
- Modify: `backend/config/db.js`
- Modify: `backend/repositories/form.repo.js`
- Modify: `backend/services/response.service.js`
- Modify: `backend/utils/seed.js`
- Modify: `backend/package.json`
- Test: `backend/qa/public-stats-db.test.js`

**Interfaces:**
- Produces `applyPublicStatsNotificationsMigration(pool: pg.Pool): Promise<void>`, invoked once from `migrate()` after all required form/response columns exist.
- The migration uses one transaction and an advisory lock, reconciles existing counts, then installs idempotent triggers and records its version.
- Trigger counter behavior: `INSERT` adds one, `DELETE` subtracts one, and an `UPDATE` that moves `responses.form` adjusts the old and new forms atomically.
- Public invalidation covers forms whose status is `published`, `visible`, or `publico`, `is_archived = false`, and visibility is neither `private` nor `unlisted`; it considers both `OLD` and `NEW` when publication/visibility changes.

- [ ] **Step 1: Write the failing PostgreSQL integration tests**

  Add focused tests for: direct SQL insert/delete and response moves maintaining exact counts; concurrent inserts maintaining exact counts; repeated migration being idempotent; committed public changes notifying a listener with a sanitized payload; rolled-back transactions producing no notification; public-to-private/unpublish/archive transitions notifying; and forms that remain private/unlisted/draft not notifying the public channel. Use unique fixture UUIDs and clean up only those fixtures.

- [ ] **Step 2: Run the tests and verify the expected failure**

  Run from `backend`: `node --test qa/public-stats-db.test.js`.
  The command must refuse to run without `PUBLIC_STATS_TEST_DATABASE_URL`, verify the target database name ends in `_test`, and reject a URL equal to `DATABASE_URL`. Before the migration exists, tests should fail because external response DML does not maintain `response_count` and no trigger notification is delivered.

- [ ] **Step 3: Implement the migration and counter ownership**

  Implement `applyPublicStatsNotificationsMigration(pool)` in `backend/db/migrations/publicStatsNotifications.js`; invoke it from `backend/config/db.js`. Use atomic arithmetic for response deltas, a one-time serialized reconciliation, and a constant `pg_notify` payload. Remove both `incrementResponseCount` calls from `response.service.js`, remove the helper if it has no remaining writer, and change `setCounters`/`seed.js` so they write only `views`. Add the `test:public-stats-db` script to `backend/package.json`.

- [ ] **Step 4: Run the database tests and existing focused backend tests**

  Run: `npm run test:public-stats-db` from `backend` with the isolated test URL configured.
  Run: `node --test qa/realtime-stats.test.js` from `backend`.
  Expected: all tests pass, external DML keeps exact counts, and the existing authenticated in-memory event behavior remains intact.

- [ ] **Step 5: Commit only Task 1 changes**

  Review `git diff` against the pre-task worktree, stage only Task 1 hunks/files, and commit with the repository's required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer.

## Task 2: Bridge PostgreSQL Notifications to Public SSE

**Files:**
- Create: `backend/services/publicStatsDbListener.js`
- Modify: `backend/services/realtimeStats.js`
- Modify: `backend/controllers/response.controller.js`
- Modify: `backend/server.js`
- Test: `backend/qa/public-stats-db-listener.test.js`
- Test: `backend/qa/realtime-stats.test.js`

**Interfaces:**
- `createPublicStatsDbListener({ createClient, onPublicStatsUpdated, setTimeoutFn, clearTimeoutFn })` returns `{ start(): Promise<void>, stop(): Promise<void>, isReady(): boolean }`. `start()` resolves after connecting or scheduling a retry, so database listener downtime does not hold HTTP startup. Production uses `new pg.Client({ connectionString: env.databaseUrl })`; tests inject an EventEmitter-compatible client.
- Export one production singleton `publicStatsDbListener` for `server.js` and `response.controller.js`.
- Add `closeStatsClients("public")` to end all public streams and clear their channel entries; response close handlers remain responsible for their own ping timers.
- The event controller returns HTTP `503` with `Retry-After: 5` while the listener is not ready. A healthy listener keeps the existing `stats_updated` SSE event and generic payload.
- Reconnect starts at 1 second, doubles up to 30 seconds, and resets after a successful `LISTEN`; shutdown cancels retries and closes the dedicated client.

- [ ] **Step 1: Write failing listener and stream lifecycle tests**

  Assert that `start()` issues `LISTEN public_stats_updates`, a notification emits exactly one sanitized public SSE event, connection loss marks the singleton unavailable and closes current clients, retry restores readiness, stop closes the client and cancels retry, and the controller refuses a new public stream with `503` while unavailable.

- [ ] **Step 2: Run tests to verify they fail for the missing listener behavior**

  Run from `backend`: `node --test qa/public-stats-db-listener.test.js qa/realtime-stats.test.js`.
  Expected: failures identify the absent listener lifecycle/readiness behavior; existing realtime-stat tests remain independently executable.

- [ ] **Step 3: Implement listener lifecycle and SSE readiness**

  Implement the injected listener factory and production singleton in `publicStatsDbListener.js`; forward only `stats_updated` invalidations through `emitPublicStatsUpdated`. Add `closeStatsClients` in `realtimeStats.js`; gate `streamPublicStats` on readiness; start the retrying listener after database migration/bootstrap and before HTTP requests are accepted; stop it during `SIGINT`/`SIGTERM` shutdown.

- [ ] **Step 4: Remove duplicate public in-memory emissions**

  Remove public invalidation from `registerView` and from response service calls because database triggers now own the public channel. Keep the existing authenticated `general`, `form:*`, and `entity:*` emissions.

- [ ] **Step 5: Run backend tests**

  Run: `node --test qa/public-stats-db-listener.test.js qa/realtime-stats.test.js` from `backend`.
  Expected: lifecycle, cleanup, readiness, and existing authenticated event tests pass; no public SSE client remains registered after listener loss.

- [ ] **Step 6: Commit only Task 2 changes**

  Review the diff against the pre-task worktree, stage only Task 2 changes, and commit with the required co-author trailer.

## Task 3: Refresh the Public UI Immediately

**Files:**
- Create: `frontend/AIFormBuilder/src/lib/publicStatsConnection.js`
- Modify: `frontend/AIFormBuilder/src/hooks/publicStatsUpdates.js`
- Test: `frontend/AIFormBuilder/qa/public-stats-connection.test.js`

**Interfaces:**
- `createPublicStatsConnection({ url, createEventSource, setIntervalFn, clearIntervalFn, setTimeoutFn, clearTimeoutFn })` returns `{ subscribe(listener): () => void }`.
- On `stats_updated`, invoke subscribers synchronously without a debounce. On stream `open`, clear fallback polling and immediately invoke subscribers to catch up.
- Use a 10,000 ms fallback interval only while the stream is unavailable; preserve the existing 5,000 ms retry after EventSource construction throws. Close the shared source and clear all timers when the last subscriber unsubscribes.
- `publicStatsUpdates.js` creates one shared connection for `${getResolvedApiBase()}/events/public-stats`; existing `usePublicInsights` and guest-mode `useForms` callbacks remain silent reloads.

- [ ] **Step 1: Write failing connection-manager tests**

  Test immediate synchronous delivery for multiple `stats_updated` events in the same turn, one shared EventSource for multiple subscribers, no fallback polling while connected, fallback polling after an error, polling cancellation and immediate refresh on recovery, the 5,000 ms retry after EventSource construction throws, and source/timer cleanup after the last unsubscribe. Use injected timers and a fake EventSource; do not wait real seconds.

- [ ] **Step 2: Run the frontend test to verify it fails**

  Run from `frontend/AIFormBuilder`: `node --test qa/public-stats-connection.test.js`.
  Expected: the test initially fails because the connection manager does not exist and the current hook manager delays notifications by 300 ms.

- [ ] **Step 3: Implement the connection manager and replace the debounce**

  Create the dependency-injected manager in `src/lib/publicStatsConnection.js`. Refactor `src/hooks/publicStatsUpdates.js` to use one manager, remove `notifyTimeout`/`scheduleNotification`, invoke listeners directly on `stats_updated`, refresh on `onopen`, and keep fallback polling only while the stream is unavailable.

- [ ] **Step 4: Run the focused frontend test and project checks**

  Run: `node --test qa/public-stats-connection.test.js` from `frontend/AIFormBuilder`.
  Run: `npm run lint`, `npm run typecheck`, and `npm run build` from `frontend/AIFormBuilder`.
  Expected: focused tests pass, no lint errors/type errors, and the production build exits with code 0.

- [ ] **Step 5: Commit only Task 3 changes**

  Review the diff against the pre-task worktree, stage only Task 3 changes, and commit with the required co-author trailer.

## Final Acceptance

- Use only `PUBLIC_STATS_TEST_DATABASE_URL` pointing to an isolated `_test` database for SQL integration tests.
- With the frontend on `:5173` and backend on `:8000`, submit/delete a response and update a view; confirm Hero metrics and public catalog counters change without reloading the document.
- In the isolated test database, insert/update/delete `responses` directly from a separate SQL connection; confirm exact counters and public UI refresh after commit, and confirm rollback produces no visible update.
- Stop/restart the listener connection during the acceptance run; confirm the client enters fallback and refreshes immediately when SSE reconnects.
- Run backend focused tests, the PostgreSQL integration test, frontend focused tests, frontend lint/typecheck/build, then review the final diff without including pre-existing worktree changes.
