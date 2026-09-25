# TASK-004: Route comparison card

> Packet for PH-02 `F-001` UI. Calls `POST /api/routes/calculate`. No Report or SOS controls.

## Reference

- **Phase:** PH-02
- **Feature(s):** F-001
- **Invariant(s) this must respect:** INV-001, INV-AS-004, INV-AS-005
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Add a bottom-sheet route comparison card: Well-Lit vs Direct, duration/distance delta, lighting percentage from the API, and a Start Walk control that draws the chosen path on the map.

## Scope — what this task is NOT

- No pin reporting, SOS, barangay portal, or hazard layer clustering (later tasks).
- No voice navigation.

## Write scope

- `handoff/TASK-004.md`
- `docs/implementation-plan.md` (status / run log only)
- `frontend/app/page.tsx`
- `frontend/app/components/**`
- `frontend/lib/routeFormat.ts`
- `frontend/scripts/test-ui-routes.js`
- `frontend/package.json` (`test:ui:routes`)
- **Do not touch:** `seed/`, `work/`, `backend/.env.local`

## Spec

- **Signature(s):** Card consumes `CalculateResult` from TASK-003. Start Walk fits the selected polyline on the Leaflet map.
- **Data shape(s):** Same API fields as TASK-003. Copy uses "Verified Well-Lit Route", never "100% Safe".
- **Edge cases:** Loading and error on calculate. Empty state before a search. API `warning` shown when present.
- **Deferred:** Live GPS origin, turn-by-turn.

## Acceptance criteria

- WHEN a user inputs an origin and destination, the system SHALL calculate and render both a Well-Lit Route and a Direct Route.
- WHEN displaying routes, the system SHALL show walking duration, distance delta, and illumination indicators.
- WHEN `cd frontend && npm run test:ui:routes` is run, the command SHALL exit 0.

## Verify command

```
cd frontend && npm run test:ui:routes
```

## Delivery Gate

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? No. Compare posts to `/api/routes/calculate`. Route buttons set the selection. Start walk draws/fits the chosen polyline.
- [x] Any fabricated stat, testimonial, or trust badge? No. Duration, distance, and lighting come from the API. Copy is "Verified Well-Lit Route", never "100% Safe".
- [x] Any screen missing an empty/loading/error state? No. Idle copy before search, loading while calculating, alert on API/network failure, map error boundary + retry.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? No. Existing slate/amber tokens, `min-h-12`, labels, and focus rings. Native number inputs and buttons.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? No. `react-leaflet` 4.2.1 `Polyline` / `useMap` / `fitBounds`. Next 14.2.35 App Router.
- [x] Any comment that just restates the code, or references a ticket/issue number? No.
- [x] Any status reported as "done" without the corresponding command actually being run? No. `npm run test:ui:routes` and `npm run build` were run.

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? No new client env. Calculate stays on the server route.
- [x] Any database table without row-level security / ownership checks in place? Unchanged from TASK-002 (`hazard_reports` RLS).
- [x] Any query built by string-concatenating user input? No. Origin/destination go in JSON; SQL stays parameterized in TASK-003.
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? No.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? Yes. `test:ui:routes` exit 0. `next build` exit 0 (SWC lockfile patch fetch timeout only).
- [x] Did you click through every changed interactive element and confirm what happened? Partial. `curl` of `GET /` showed Load map, Compare routes, empty-state copy, and the disclaimer. `POST /api/routes/calculate` on the running `npm run dev` returned 500 `Server database is not configured` because `frontend/.env.local` has no `DATABASE_URL`.
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? No browser tools. Start walk / polyline fit was not clicked in a real browser. Card happy-path needs `DATABASE_URL` in `frontend/.env.local` and a restarted Next process.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run test:ui:routes` exit 0
- **Delivery Gate:** pass (browser Start walk unverified; live calculate needs `DATABASE_URL` in `frontend/.env.local`)
