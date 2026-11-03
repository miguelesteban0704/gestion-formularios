# Entity Admin Self-Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit one self-registered `entity_admin` per entity through its active access URL, authenticate the new account, and preserve that URL for later sign-in.

**Architecture:** Keep the access URL as the invitation and login boundary. A shared backend resolver verifies its database row and encrypted context; the server derives role and entity from that record. A partial unique index is the final concurrency guard, while registration and admin-managed create/update paths translate collisions into `409` responses. The registration endpoint creates the standard local session and the existing frontend restores it before routing by role.

**Tech Stack:** React 19, React Router, Express, Zod, PostgreSQL, bcryptjs, JWT, native Node QA probes.

**Spec:** `docs/superpowers/specs/2026-10-06-entity-admin-self-registration-design.md`

## Global Constraints

- At most one `entity_admin` row may exist for each non-null `entity_id`, regardless of `is_active`.
- Only an active access URL whose stored role is `entity_admin` may create an entity administrator.
- Role and entity come from the validated access URL; request-body role/entity fields are never authoritative.
- Do not automatically merge, disable, or delete existing accounts when a migration detects duplicates.
- Existing `form_creator` access links and the superadmin registration workflow retain their current contracts except for duplicate-admin rejection.

## Review Focus

- Concurrent registrations for one entity: exactly one succeeds and the other receives `409`; prove with two in-flight requests in the QA probe.
- Tampered context or slug mismatch: reject without creating a user or session; probe modified `ctx`, role, and entity claims.
- Revoked URL or inactive entity: reject registration while preserving existing users; probe both conditions.
- Existing but inactive `entity_admin`: still occupies the entity's slot; probe a registration conflict.
- Existing duplicate data before migration: startup fails with an actionable message and makes no data changes; probe the preflight query logic.

---

### Task 1: Database Cardinality and Repository Lookup

**Files:**
- Modify: `backend/config/db.js`
- Modify: `backend/db/schema.sql`
- Modify: `backend/repositories/user.repo.js`
- Create: `backend/qa/entity-admin-registration-probe.js`

**Interfaces:**
- Produces: `userRepo.findEntityAdminByEntity(entityId, excludeUserId = null)`, returning the mapped user or `null`.
- Produces: partial unique index `users_entity_admin_entity_unique_idx` on `users(entity_id)` where `role = 'entity_admin' AND entity_id IS NOT NULL`.

- [ ] **Step 1: Write the failing database probe.** Create `backend/qa/entity-admin-registration-probe.js` with temporary entity/user fixtures and cleanup in `finally`; the first `entity_admin` insert must succeed, a second for the same entity must hit the named unique index, and a different entity must be allowed.
- [ ] **Step 2: Run the focused probe and verify the missing index fails the expected assertion.** Run: `node qa/entity-admin-registration-probe.js`. Expected before implementation: duplicate row is accepted or the index assertion fails.
- [ ] **Step 3: Add migration preflight and partial unique index.** In `connectDB` migration, query for duplicate admins and admins with null `entity_id`; throw an actionable error before creating the index if either exists. Do not mutate those rows. Add the matching index to `schema.sql`.
- [ ] **Step 4: Add `findEntityAdminByEntity(entityId, excludeUserId)` to `user.repo.js`.** Use a parameterized query for `role = 'entity_admin'` and the requested `entity_id`; optionally exclude the target user during admin edits.
- [ ] **Step 5: Run the database probe.** Run: `node qa/entity-admin-registration-probe.js`. Expected: the first account succeeds, a second for the same entity fails with constraint `users_entity_admin_entity_unique_idx`, and a different entity succeeds.

### Task 2: Shared Access-URL Validation and Public Registration Endpoint

**Files:**
- Create: `backend/services/accessUrl.service.js`
- Modify: `backend/controllers/admin.controller.js`
- Modify: `backend/controllers/localAuth.controller.js`
- Modify: `backend/routes/localAuth.routes.js`
- Modify: `backend/app.js`

**Interfaces:**
- Produces: `resolveActiveAccessUrl(slug, suppliedContext)` returning the active URL row after verifying context `s`, `r`, and `eid` against its stored slug, role, and entity.
- Produces: `localRegisterByAccess(req, res)` at `POST /api/auth/local/register-by-access/:slug`; accepts only name, email, optional username, password, and optional context.
- Consumes: `userRepo.findEntityAdminByEntity(entityId)` from Task 1.

- [ ] **Step 1: Add failing cases to the QA probe** for tampered/mismatched context, inactive URL, inactive entity, role other than `entity_admin`, existing admin, attacker-supplied role/entity, and the resolver's `registrationAvailable` value. Assert rejected requests do not create a user or session; availability is true only for an active entity-admin link with no existing admin.
- [ ] **Step 2: Run the probe and verify those cases fail against current behavior.** Run: `node qa/entity-admin-registration-probe.js`. Expected before implementation: the scoped registration route is unavailable.
- [ ] **Step 3: Implement the shared resolver.** Resolve the slug through `accessUrl.repo`, reject missing/inactive rows, decrypt `suppliedContext || row.context`, and require exact matches for stored slug, role, and `entityId`. Reuse it from the existing public resolver so login and registration apply the same scope checks.
- [ ] **Step 4: Implement the public registration controller and route.** Validate only account fields with Zod; require a resolved `entity_admin` URL and active entity; reject an existing admin with `409`; create the user using the resolved role/entity only. Translate unique-index violations to `409` for race safety. Audit the creation with the access URL and entity identifiers, never password data.
- [ ] **Step 5: Reuse local-session issuance.** Extract the token/session creation shared by `localLogin` and registration into one helper. The registration response returns the standard token and mapped user; it must not return password hashes.
- [ ] **Step 6: Apply `localAuthLimiter` to `/api/auth/local/register-by-access`.** Keep the global API limiter and existing login limiter unchanged.
- [ ] **Step 7: Run the focused QA probe.** Run: `node qa/entity-admin-registration-probe.js`. Expected: valid scoped registration returns `201` with the fixed role/entity and token; `registrationAvailable` is correct; all invalid, duplicate, and tampered cases reject without a second account.

### Task 3: Enforce the Same Rule in Superadmin User Management

**Files:**
- Modify: `backend/controllers/localAuth.controller.js`
- Modify: `backend/controllers/admin.controller.js`

**Interfaces:**
- Consumes: `userRepo.findEntityAdminByEntity(entityId, excludeUserId)` and the named database constraint from Task 1.
- Produces: consistent `409` errors when an administrator tries to create or edit a second `entity_admin` for an entity.

- [ ] **Step 1: Add failing QA cases** for superadmin-managed user creation and role/entity updates that would duplicate an entity's administrator; assert the existing account remains unchanged.
- [ ] **Step 2: Run the probe and verify the duplicate paths currently succeed or lack the expected conflict.** Run: `node qa/entity-admin-registration-probe.js`.
- [ ] **Step 3: Add preflight checks to local admin registration and `admin.updateUser`.** Exclude the user being edited; permit a no-op update of the current sole administrator. Map the unique-index race error to the same `409` response.
- [ ] **Step 4: Run the focused QA probe.** Run: `node qa/entity-admin-registration-probe.js`. Expected: creates/updates that preserve one admin pass; duplicates receive `409`. The existing Users modal keeps open and surfaces the backend conflict through its current error toast.

### Task 4: Entity Access Registration UI and Immediate Sign-In

**Files:**
- Modify: `frontend/AIFormBuilder/src/services/index.js`
- Modify: `frontend/AIFormBuilder/src/pages/AccessLogin.jsx`

**Interfaces:**
- Consumes: `GET /api/access/:slug` returning `registrationAvailable` for entity-admin links, and `POST /api/auth/local/register-by-access/:slug` returning `{ token, user }`.
- Produces: `localAuthApi.registerByAccess(slug, payload)` and a tabbed entity-login page.

- [ ] **Step 1: Add the API client and segmented login/register tabs.** Default to registration only when resolved role is `entity_admin` and `registrationAvailable` is true; otherwise show login only. Reuse the existing `AuthCard`, `AuthField`, role label, and entity chip.
- [ ] **Step 2: Submit registration using account fields only.** On success, call the existing `restoreWithToken(token)`, then `navigate(homePathForRole(user, language), { replace: true })`. On failure, show the API error and preserve entered non-password fields.
- [ ] **Step 3: Manually verify the browser flow** with an active temporary entity-admin link: registration is selected first, login is reachable, entity/role are visible and immutable, errors retain the form, and successful registration opens the entity dashboard. Also confirm form-creator links remain login-only. Run `npm run build` from `frontend/AIFormBuilder`.

### Task 5: Integration Probe and Final Gates

**Files:**
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `npm run qa:entity-admin-registration`, an opt-in integration probe that requires the local API and database and cleans up all temporary records.

- [ ] **Step 1: Complete the probe fixture.** Extend the Task 1 probe with randomized active entities and signed access URLs using `accessUrl.repo` and `urlCrypto`; call the HTTPS API with TLS verification configured consistently with existing backend probes.
- [ ] **Step 2: Cover acceptance cases.** Verify entity-admin registration and token/session creation; same-link login after registration; creator-link registration denial; invalid/tampered/revoked URL rejection; duplicate rejection including concurrent requests; superadmin create/update conflict; and cleanup.
- [ ] **Step 3: Add the npm script and run the probe.** Run from `backend`: `npm run qa:entity-admin-registration`. Expected: all named checks pass and temporary entities, links, users, and sessions are removed.
- [ ] **Step 4: Run final gates.** Run `npm run build` from `frontend/AIFormBuilder` and inspect `get_errors` on changed files. Expected: build succeeds and no new editor errors are present.
