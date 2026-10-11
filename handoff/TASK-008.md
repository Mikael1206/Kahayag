# TASK-008: Barangay portal triage

> Packet for PH-03 `F-005`. Auth first, then barangay ownership. No SAP/ERP. No citizen PII.

## Reference

- **Phase:** PH-03
- **Feature(s):** F-005
- **Invariant(s) this must respect:** INV-002, INV-AS-001, INV-AS-002, INV-AS-003
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Add `/portal` for officials: Supabase Auth login, dashboard filtered to their `barangay_id`, ranked corridor list, one-step status updates through resolved, resolution count, CSV download, and browser print for a work-order table.

## Scope — what this task is NOT

- No municipal ERP, no heatmap tiles, no password hashing of our own (Supabase Auth stores credentials).
- No service-role key in the client. No anonymous status updates.

## Write scope

- `handoff/TASK-008.md`
- `docs/implementation-plan.md` (status / run log only)
- `backend/sql/002_barangay_portal.sql`
- `frontend/lib/portal*.ts`
- `frontend/app/portal/**`
- `frontend/app/api/portal/**`
- `frontend/app/page.tsx` (Officials link only)
- `frontend/app/globals.css` (print rules)
- `frontend/.env.example`
- `frontend/scripts/test-portal.js`
- `frontend/package.json` / lockfile (`@supabase/supabase-js`, `test:portal`)
- **Do not touch:** `seed/`, `work/`, `backend/.env.local`, `frontend/.env.local`

## Spec

- **Signature(s):** `POST /api/portal/session` `{ email, password }` sets an httpOnly cookie. `DELETE` clears it. `GET /api/portal/reports` after auth+membership. `PATCH /api/portal/reports` `{ id, status }` next step only.
- **Data shape(s):** Official row from `barangay_users`. Reports: id, lat, lng, category, status, confirmCount, barangayId, createdAt. Corridors: grid cell, count, latestAt.
- **Edge cases:** Missing Supabase env → login error, no fake dashboard. Auth OK but no `barangay_users` row → 403. Other barangay's assigned pin → 403. Invalid transition → 400.
- **Deferred:** Polygon ST_Contains filter, live websocket (public map already hides `resolved` on the next fetch/pan).

## Acceptance criteria

- WHEN an authorized official logs in, the system SHALL show a dashboard filtered to their barangay (plus unassigned pins).
- WHEN reviewing reports, the system SHALL list top dark corridors by density and recency.
- WHEN an official advances a report, the system SHALL move status along Open → Under Inspection → Work Order Issued → Resolved.
- WHEN status becomes Resolved, `resolved_at` is set and the public list omits that pin on the next hazard fetch.
- WHEN requested, the system SHALL offer CSV and a printable work-order table (browser Print / Save as PDF).
- WHEN `cd frontend && npm run test:portal` is run, the command SHALL exit 0.

## Verify command

```
cd frontend && npm run test:portal
```

## Delivery Gate

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? No. Sign in, sign out, row select, status advance, CSV, print, and Back to map all do real work.
- [x] Any fabricated stat, testimonial, or trust badge? No. Corridor ranks and resolved count come from stored reports.
- [x] Any screen missing an empty/loading/error state? No. Session check, login errors, empty table, load/update errors.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? No. Existing tokens, labels, `min-h-12`, focus rings.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? No. `@supabase/supabase-js@2.49.8` `createClient`, `signInWithPassword`, `getUser`.
- [x] Any comment that just restates the code, or references a ticket/issue number? No.
- [x] Any status reported as "done" without the corresponding command actually being run? No.

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? No service role. Only public URL + anon key placeholders. Session cookie is httpOnly.
- [x] Any database table without row-level security / ownership checks in place? `barangay_users` RLS (own row). Hazard UPDATE policy for officials. Handler also checks membership then ownership.
- [x] Any query built by string-concatenating user input? No.
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? No.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? Yes. `test:portal` exit 0 (applied `002_barangay_portal.sql`, RLS on). `next build` exit 0.
- [x] Did you click through every changed interactive element and confirm what happened? No. Login needs a Supabase Auth user plus a `barangay_users` row and `NEXT_PUBLIC_SUPABASE_*` in `frontend/.env.local`.
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? Yes. Live sign-in, status click, CSV, and print were not exercised in a browser.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run test:portal` exit 0. `npm run build` exit 0; `/portal` and `/api/portal/*` compiled.
- **Delivery Gate:** pass (browser login/triage unverified until Auth env + official row exist)

