# TASK-006: Night map, segment colors, clustered pins

> Packet for PH-02 `F-003`. Builds on TASK-004 polylines and TASK-005 pins. No SOS.

## Reference

- **Phase:** PH-02
- **Feature(s):** F-003
- **Invariant(s) this must respect:** INV-AS-004, INV-AS-005
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Apply OSM invert only in local night hours (18:00–06:00). Color route segments from unresolved pins (green well-lit, yellow unconfirmed direct, red within 30 m of a report). Load viewport pins, cluster them when zoomed out, and show category, relative time, and confirm count on tap.

## Scope — what this task is NOT

- No SOS, barangay portal, photo upload, or lighting GIS import.
- No new npm mapping libraries (cluster in-app; Leaflet `divIcon` only).

## Write scope

- `handoff/TASK-006.md`
- `docs/implementation-plan.md` (status / run log only)
- `frontend/lib/mapStyle.ts`
- `frontend/lib/hazards.ts` / `frontend/app/api/hazards/route.ts` (bbox GET)
- `frontend/app/components/**`
- `frontend/app/globals.css`
- `frontend/scripts/test-map.js`
- `frontend/package.json` (`test:map`)
- **Do not touch:** `seed/`, `work/`, `backend/.env.local`

## Spec

- **Signature(s):** `GET /api/hazards?west=&south=&east=&north=` returns `{ pins }` unresolved in the box (cap 200). Existing `lat/lng/category` nearby lookup stays.
- **Data shape(s):** Segment colors from pin proximity only, not a fabricated city lighting layer. Cluster items `{ count, lat, lng, pins }` below zoom 15.
- **Edge cases:** Invalid bbox → 400. Fetch error on map → visible retry. Daytime tiles uninverted. Empty viewport → no fake pins.
- **Deferred:** Subdivision interiors, heatmaps.

## Acceptance criteria

- WHEN viewing the map between 6:00 PM and 6:00 AM (local time), the system SHALL default to a high-contrast Dark Mode optimized for night viewing.
- WHEN browsing the map, the system SHALL render street segments with color-coded safety indicators.
- WHEN a user clicks on any hazard pin, the system SHALL display the hazard category, the report timestamp, and confirmation count.
- WHEN zooming out to a neighborhood/barangay level, the system SHALL cluster individual pins into aggregate numerical hazard badges.
- WHEN `cd frontend && npm run test:map` is run, the command SHALL exit 0.

## Verify command

```
cd frontend && npm run test:map
```

## Delivery Gate

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? No. Cluster badges zoom in. Pins open popups. Fetch error tells the user to pan to retry (map moveend reloads).
- [x] Any fabricated stat, testimonial, or trust badge? No. Colors come from 30 m pin proximity. Legend states that. Confirm counts and times come from stored reports.
- [x] Any screen missing an empty/loading/error state? No. Loading reports, empty viewport copy, fetch error on the legend.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? No. Existing tokens; cluster/pin use Leaflet hit targets. Legend is not a fake control.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? No. Leaflet 1.9.4 `divIcon`; react-leaflet 4.2.1 `Marker`/`CircleMarker`/`Popup`/`useMapEvents`.
- [x] Any comment that just restates the code, or references a ticket/issue number? No.
- [x] Any status reported as "done" without the corresponding command actually being run? No.

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? No.
- [x] Any database table without row-level security / ownership checks in place? No new tables.
- [x] Any query built by string-concatenating user input? No. Bbox values are parameters.
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? No.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? Yes. `test:map` exit 0. `next build` exit 0. Production `GET` bbox 200 with pins; oversized box 400.
- [x] Did you click through every changed interactive element and confirm what happened? Partial. No browser click on clusters/popups.
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? Yes. Night invert depends on local clock. An existing `npm run dev` may need a restart after this production build.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run test:map` exit 0. Bbox GET 200 / invalid 400. `npm run build` exit 0.
- **Delivery Gate:** pass (browser cluster/popup click-through unverified)

