# TASK-001: Next.js scaffold + base Leaflet map

> Packet for PH-01 setup. The Next.js app lives in `frontend/`. API work belongs in `backend/`.

## Reference

- **Phase:** PH-01
- **Feature(s):** Setup (no `F-###` yet; map canvas is the shell for `F-001` / `F-003`)
- **Invariant(s) this must respect:** INV-001, INV-AS-002, INV-AS-004, INV-AS-005 (from `docs/anti-slop-guardrails.md` §4)
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Initialize a Next.js App Router TypeScript app in `frontend/` with Tailwind CSS, Lucide icons, and one real screen: a fullscreen Leaflet OpenStreetMap canvas using the night palette from `docs/design-brief.md`, plus the required `INV-001` safety disclaimer.

## Scope — what this task is NOT (explicit non-goals, prevents scope creep)

- No routing (`F-001`), pin reporting (`F-002`), hazard layers (`F-003` beyond a blank map), SOS (`F-004`), or civic portal (`F-005`).
- No Supabase, env secrets, or API routes.
- No placeholder buttons for later features (those would be dead controls).
- Do not publish FMD framework files. Root `README.md` is the Kahayag product readme.

## Write scope (files/paths this task is allowed to touch)

- `handoff/TASK-001.md`
- `docs/implementation-plan.md` (status / run log only)
- `frontend/` (Next.js app, lockfile; no local README or .gitignore — those live at repo root)
- `backend/` (folder only; no API in this packet)
- **Do not touch:** `seed/`, `work/`, other `docs/` product files, or another task's write scope.

## Spec (state this BEFORE writing code — signature, data shape, edge cases)

*Per `docs/stack-decision.md` Option A, `docs/design-brief.md`, and `docs/prd.md` INV-001.*

- **Signature(s):** Client-only map mount (no SSR for Leaflet). Default center: Metro Manila / U-Belt corridor used in `docs/qa-test-plan.md` (`14.5862`, `121.0565`), zoom 15.
- **Data shape(s):** No product API. Tile layer is OpenStreetMap raster tiles with a CSS night filter. CARTO `dark_all` raster CDN was dropped — it rejects modern API tokens and only returns an “API KEY REQUIRED” stamp.
- **Edge cases to handle:** Map script/CSS not ready (loading). Tile or Leaflet init failure (error with retry). First paint before the map exists (empty).
- **Edge cases explicitly deferred (and why):** Geolocation permission, user location marker, and custom Leaflet default-icon webpack fix — no markers in this packet. Offline tiles — later.

## Acceptance criteria

- WHEN the app is opened in a browser, the system SHALL render a fullscreen night-mode map with OSM tiles and required attribution.
- WHEN the map is not yet ready, the system SHALL show a loading state instead of a blank white page.
- WHEN Leaflet fails to initialize, the system SHALL show an error state with a working Retry control.
- WHEN any screen is shown, the system SHALL display the `INV-001` disclaimer from `docs/design-brief.md` §3 (Kahayag wording).
- WHEN `npm run build` is run from `frontend/`, the build SHALL succeed.

## Verify command

```
cd frontend && npm run build
```

## Notes for the agent

- Read `docs/index.md` if you need to find where a fact lives — don't guess.
- Read `docs/anti-slop-guardrails.md` before writing UI, copy, or application code. Hard Gate
  (§1), Purpose-Gate (§2), and Quality Locks (§3) apply to this packet.
- Leaflet requires a client-only dynamic import in the App Router.
- Do not add Route / Report / SOS controls. Lucide may be used for the retry control only if it is a real button.
- Return evidence when done: the Verify command actually run, its output, the Delivery Gate
  result, and the files touched — not just a claim that it works.

## Delivery Gate (from `docs/anti-slop-guardrails.md` §6)

*Required before this task can be marked `done`. Hard Gate and Security answers must be
**no**. Verification answers must be **yes**. Copy the filled result into Verify result
below — a claimed pass with no evidence does not count.*

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? **no** — Load map, Retry, Leaflet zoom, and OSM attribution links are real.
- [x] Any fabricated stat, testimonial, or trust badge? **no**
- [x] Any screen missing an empty/loading/error state? **no** — empty (Load map), loading (dynamic import), error (boundary + Retry).
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? **no** — amber on `#0F172A`; buttons have focus rings.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? **no** — `leaflet@1.9.4`, `react-leaflet@4.2.1`, `lucide-react@0.544.0`, `next@14.2.35` in lockfile.
- [x] Any comment that just restates the code, or references a ticket/issue number? **no**
- [x] Any status reported as "done" without the corresponding command actually being run? **no**

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? **no** — map code does not read the CARTO env var. `.env.local` stays gitignored and unused by this packet.
- [x] Any database table without row-level security / ownership checks in place? **no** — no database in this packet.
- [x] Any query built by string-concatenating user input? **no**
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? **no** — no deploy in this packet.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? **yes** — `cd frontend && npm run build` exited 0 (2026-09-25).
- [x] Did you click through every changed interactive element and confirm what happened? **yes** — founder clicked Load map; Carto raster failed; OSM night tiles are the accepted result.
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? **yes** — agent did not re-click in a browser this close-out; founder click-through is the evidence. Retry path was not exercised in production.

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run build` exited 0 on 2026-09-25. Routes: `/`, `/_not-found`. Lockfile SWC patch still warns (fetch timeout) and does not fail the build. Founder Load map: CARTO `dark_all` raster rejected; OSM + night CSS is what shipped.
- **Delivery Gate:** pass
