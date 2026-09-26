# TASK-005: Dark-spot report + 25 m dedup

> Packet for PH-02 `F-002`. Server route writes `hazard_reports`. No SOS, portal, or pin clustering.

## Reference

- **Phase:** PH-02
- **Feature(s):** F-002
- **Invariant(s) this must respect:** INV-002, INV-AS-002, INV-AS-003, INV-AS-005
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Add Report Dark Spot: GPS (or form origin fallback), one-tap categories, `GET`/`POST /api/hazards`, 25 m same-category prompt **Confirm Existing Report (+1)**, insert or increment `confirm_count`, and show the pin immediately as Community Reported.

## Scope — what this task is NOT

- No photo upload, offline queue (`F-103`), SOS, barangay portal, or neighborhood pin clustering (TASK-006).
- No anonymous `UPDATE` RLS policy (confirm uses the server `DATABASE_URL` role).

## Write scope

- `handoff/TASK-005.md`
- `docs/implementation-plan.md` (status / run log only)
- `frontend/lib/hazards.ts`
- `frontend/app/api/hazards/route.ts`
- `frontend/app/components/**`
- `frontend/scripts/test-hazards.js`
- `frontend/package.json` (`test:hazards`)
- **Do not touch:** `seed/`, `work/`, `backend/.env.local`

## Spec

- **Signature(s):** `GET /api/hazards?lat=&lng=&category=` nearby unresolved same category within 25 m. `POST /api/hazards` `{ lat, lng, category, description?, confirmId? }`. Missing `confirmId` while a neighbor exists → 409. `confirmId` increments that row.
- **Data shape(s):** Hazard `{ id, lat, lng, category, status, confirmCount, createdAt }`. Categories: `busted_light`, `unlit_street`, `damaged_pole`, `hazard`.
- **Edge cases:** Invalid coords/category → 400. Missing `DATABASE_URL` → 500. GPS denied → error plus use origin from the route form. No PII columns or client secrets.
- **Deferred:** Photos, offline sync, cluster badges.

## Acceptance criteria

- WHEN a user taps Report Dark Spot, the system SHALL pre-fill coordinates from GPS when the browser provides them.
- WHEN submitting a report, the system SHALL use one tap per category (Busted Light, No Poles/Pitch Black, Damaged Pole/Wiring, Safety Concern).
- WHEN a report is successfully submitted, the system SHALL show the pin as Community Reported.
- WHEN an unresolved same-category pin is within 25 meters, the system SHALL prompt Confirm Existing Report (+1) instead of inserting a duplicate.
- WHEN `cd frontend && npm run test:hazards` is run, the command SHALL exit 0.

## Verify command

```
cd frontend && npm run test:hazards
```

## Delivery Gate

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? No. Report opens the modal. Categories set the type. Submit/confirm hit `/api/hazards`. Cancel/Escape close.
- [x] Any fabricated stat, testimonial, or trust badge? No. Confirm count and Community Reported come from the saved row.
- [x] Any screen missing an empty/loading/error state? No. GPS loading/error, submit checking/saving/error, GET 400, POST 409/500.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? No. Existing tokens, `min-h-12`, focus rings, dialog + Escape.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? No. `pg@8.16.3`, `react-leaflet` 4.2.1 `CircleMarker`/`Popup`, `navigator.geolocation`.
- [x] Any comment that just restates the code, or references a ticket/issue number? No.
- [x] Any status reported as "done" without the corresponding command actually being run? No.

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? No. Client imports `hazardTypes` only. `DATABASE_URL` stays server-side.
- [x] Any database table without row-level security / ownership checks in place? No new tables. Confirm uses the server DB role (anon still has no UPDATE policy).
- [x] Any query built by string-concatenating user input? No. Parameterized SQL.
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? No.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? Yes. `test:hazards` exit 0. `next build` exit 0. Live GET/POST on the running dev server: 201 create, 409 duplicate, 200 confirm (+1).
- [x] Did you click through every changed interactive element and confirm what happened? Partial. API and SQL verified. No browser tools for GPS permission / modal click-through.
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? Yes. GPS pre-fill depends on the browser. Photo and offline queue are deferred.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run test:hazards` exit 0. Live POST create 201 / duplicate 409 / confirm 200. `npm run build` exit 0; `/api/hazards` listed.
- **Delivery Gate:** pass (browser GPS/modal click-through unverified)

