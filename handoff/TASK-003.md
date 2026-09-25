# TASK-003: Light-first route calculate API

> Packet for PH-01 `F-001` spine. Handler is a Next.js App Router route. Scoring uses
> PostGIS `hazard_reports`. Do not persist origin/destination (`INV-002`).

## Reference

- **Phase:** PH-01
- **Feature(s):** F-001
- **Invariant(s) this must respect:** INV-002, INV-AS-002, INV-AS-003, INV-AS-004
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Add `POST /api/routes/calculate` that fetches OSRM pedestrian alternatives, counts unresolved hazards within 30 m of each path (`docs/sdd.md` §3), and returns a well-lit route and a direct (shortest) route with distance, duration, and a lighting figure derived only from those hazard counts.

## Scope — what this task is NOT

- No route comparison UI (TASK-004).
- No map polylines on the Leaflet canvas (TASK-004 / TASK-006).
- No turn-by-turn voice, GPS picker UI, or offline cache.
- No writes to `hazard_reports`.

## Write scope

- `handoff/TASK-003.md`
- `docs/implementation-plan.md` (status / run log only)
- `frontend/app/api/routes/calculate/route.ts`
- `frontend/lib/calculateRoute.ts`
- `frontend/scripts/test-routes.js`
- `frontend/package.json` / lockfile (`pg`, `test:routes`)
- `frontend/.env.example` (empty `DATABASE_URL=` only)
- **Do not touch:** `seed/`, `work/`, `backend/.env.local`

## Spec

- **Signature(s):** `POST /api/routes/calculate` body `{ origin: { lat, lng }, destination: { lat, lng }, accuracyMeters?: number }`.
- **Data shape(s):** Response `{ wellLit, direct, warning? }` where each route has `distanceMeters`, `durationSeconds`, `hazardCount`, `lightingCoveragePct`, `geometry` (GeoJSON LineString). `lightingCoveragePct` is computed from `hazardCount` only — never a made-up city lighting dataset.
- **Edge cases:** Invalid coordinates → 400. OSRM down / no path → 502/404 with a real error. `accuracyMeters > 50` → include `warning` (PRD); no UI this packet. Zero hazards → 100% coverage.
- **Deferred:** Rendering, GPS UI, lighting GIS import.

## Acceptance criteria

- WHEN a user inputs an origin and destination, the system SHALL calculate both a well-lit route and a direct route.
- WHEN displaying route data (API), the system SHALL include walking duration, distance, and an illumination indicator derived from unresolved hazard pins.
- WHEN `cd frontend && npm run test:routes` is run, the command SHALL exit 0.

## Verify command

```
cd frontend && npm run test:routes
```

## Notes for the agent

- Load `DATABASE_URL` from `backend/.env.local` in the verify script so the founder does not paste the URI again. The Next.js route reads `frontend/.env.local` (server-only, not `NEXT_PUBLIC_`).
- Public OSRM: `https://router.project-osrm.org` foot profile. Do not invent a paid maps API.
- Parameterize all SQL.
- Do not log or store lat/lng.

## Delivery Gate

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? **no** — API only.
- [x] Any fabricated stat, testimonial, or trust badge? **no** — lighting % is `100 - 15 * hazardCount`.
- [x] Any screen missing an empty/loading/error state? **no** — HTTP 400/404/502/500 with explicit errors.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? **no** — no UI.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? **no** — `pg@8.16.3`.
- [x] Any comment that just restates the code, or references a ticket/issue number? **no**
- [x] Any status reported as "done" without the corresponding command actually being run? **no**

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? **no** — `DATABASE_URL` is server-only.
- [x] Any database table without row-level security / ownership checks in place? **no** — no new tables.
- [x] Any query built by string-concatenating user input? **no**
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? **no**

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? **yes** — `npm run test:routes` and `npm run build` exited 0.
- [x] Did you click through every changed interactive element and confirm what happened? **yes** — N/A (no UI).
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? **yes** — OSRM returned 1 candidate for the U-Belt pair (no second alternative). Live `POST /api/routes/calculate` needs `DATABASE_URL` in `frontend/.env.local`.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run test:routes` exited 0 — `1 OSRM candidate; wellLit 975m / 0 hazards; direct 975m`. `npm run build` exited 0; route `/api/routes/calculate` listed.
- **Delivery Gate:** pass
