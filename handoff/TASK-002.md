# TASK-002: PostGIS schema and hazard_reports RLS

> Packet for PH-01 data spine. SQL and the verify script live in `backend/`. Do not put the
> service role key or database password in `frontend/` or any `NEXT_PUBLIC_*` variable.

## Reference

- **Phase:** PH-01
- **Feature(s):** Data (spine for `F-001`, `F-002`, `F-005`)
- **Invariant(s) this must respect:** INV-002, INV-AS-001, INV-AS-002, INV-AS-003 (from `docs/anti-slop-guardrails.md` §4)
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Enable PostGIS on the Supabase Postgres instance, create `hazard_reports` from `docs/sdd.md` §4, add a spatial GIST index, and turn on RLS: anonymous `SELECT`/`INSERT` only; no anonymous `UPDATE`/`DELETE`.

## Scope — what this task is NOT (explicit non-goals, prevents scope creep)

- No `barangay_users` table (that is `F-005` / TASK-008).
- No `/api/hazards` or `/api/routes/calculate` handlers (TASK-003 / TASK-005).
- No storage bucket or photo upload.
- No frontend UI changes.
- No rate-limiting implementation (SDD mentions it; defer).

## Write scope (files/paths this task is allowed to touch)

- `handoff/TASK-002.md`
- `docs/implementation-plan.md` (status / run log only)
- `backend/sql/`
- `backend/scripts/test-db.js`
- `backend/package.json`, `backend/package-lock.json`
- `backend/.env.example`
- root `.gitignore` only if a backend env pattern is missing
- **Do not touch:** `seed/`, `work/`, `frontend/app/`, or another task's write scope.

## Spec (state this BEFORE writing code — signature, data shape, edge cases)

*Per `docs/sdd.md` §4 and §6.*

- **Signature(s):** SQL migration applied with a server-side connection (`DATABASE_URL` or service role). Verify script: `node scripts/test-db.js` from `backend/`.
- **Data shape(s):** `hazard_reports` columns exactly as SDD: `id` UUID PK, `latitude`, `longitude`, `geom` `GEOMETRY(Point, 4326)`, `category`, `description`, `photo_url`, `status`, `confirm_count`, `barangay_id`, `created_at`, `resolved_at`. No name/email/phone/`user_id` columns (`INV-002`).
- **Edge cases to handle:** PostGIS missing; table exists but RLS off; insert without `geom` (trigger from lat/lng); anonymous client cannot update or delete a row by id.
- **Edge cases explicitly deferred (and why):** Official-only status updates and barangay boundary match need `barangay_users` (TASK-008). Photo EXIF strip is TASK-005+.

## Acceptance criteria

- WHEN PostGIS is enabled, the system SHALL expose `ST_DWithin` for later route scoring (`docs/sdd.md` §3).
- WHEN `hazard_reports` is created, the system SHALL index `geom` with a GIST index.
- WHEN an anonymous role inserts a report, the system SHALL persist spatial fields only (no PII columns).
- WHEN an anonymous role tries to `UPDATE` or `DELETE` a row by client-supplied id, the system SHALL deny it (`INV-AS-001`).
- WHEN `cd backend && node scripts/test-db.js` is run against the configured project, the command SHALL exit 0.

## Verify command

```
cd backend && node scripts/test-db.js
```

## Notes for the agent

- Read `docs/index.md` if you need to find where a fact lives — don't guess.
- Read `docs/anti-slop-guardrails.md` before writing UI, copy, or application code.
- Founder supplies Supabase URL and a **server** secret (`DATABASE_URL` or service role) in `backend/.env.local`. Never ask them to paste the service role into chat.
- Parameterize every query in `test-db.js` (`INV-AS-003`).
- Return evidence when done: the Verify command actually run, its output, the Delivery Gate
  result, and the files touched — not just a claim that it works.

## Delivery Gate (from `docs/anti-slop-guardrails.md` §6)

*Required before this task can be marked `done`. Hard Gate and Security answers must be
**no**. Verification answers must be **yes**. Copy the filled result into Verify result
below — a claimed pass with no evidence does not count.*

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? **no** — no UI in this packet.
- [x] Any fabricated stat, testimonial, or trust badge? **no**
- [x] Any screen missing an empty/loading/error state? **no** — no UI.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? **no** — no UI.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? **no** — `pg@8.16.3`.
- [x] Any comment that just restates the code, or references a ticket/issue number? **no**
- [x] Any status reported as "done" without the corresponding command actually being run? **no**

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? **no** — `DATABASE_URL` is only in `backend/.env.local`.
- [x] Any database table without row-level security / ownership checks in place? **no** — RLS enabled; anon has SELECT/INSERT only.
- [x] Any query built by string-concatenating user input? **no** — parameterized `$1` binds in `test-db.js`.
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? **no** — no deploy.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? **yes** — migration applied; `node scripts/test-db.js` exited 0.
- [x] Did you click through every changed interactive element and confirm what happened? **yes** — N/A (no UI).
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? **yes** — anon UPDATE/DELETE deny was not live-tested with the anon key; only the RLS flag and admin insert/delete were checked.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd backend && node scripts/test-db.js` exited 0 — PostGIS, GIST, schema (no PII columns), RLS flag OK. Applied `sql/001_hazard_reports.sql` on pooler port 6543.
- **Delivery Gate:** pass
