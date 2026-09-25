# TASK-001: Next.js scaffold + base Leaflet map

> Packet for PH-01 setup. App lives in `frontend/`. API work belongs in `backend/`.

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
- `frontend/` (Next.js app, lockfile)
- `backend/` (folder only; no API in this packet)
- **Do not touch:** `seed/`, `work/`, other `docs/` product files, root `README.md`, or another task's write scope.

## Spec (state this BEFORE writing code — signature, data shape, edge cases)

*Per `docs/stack-decision.md` Option A, `docs/design-brief.md`, and `docs/prd.md` INV-001.*

- **Signature(s):** Client-only map mount (no SSR for Leaflet). Default center: Metro Manila / U-Belt corridor used in `docs/qa-test-plan.md` (`14.5862`, `121.0565`), zoom 15.
- **Data shape(s):** No product API. Tile layer is public Carto Dark Matter + OSM attribution (real providers, not invented).
- **Edge cases to handle:** Map script/CSS not ready (loading). Tile or Leaflet init failure (error with retry). First paint before the map exists (empty).
- **Edge cases explicitly deferred (and why):** Geolocation permission, user location marker, and custom Leaflet default-icon webpack fix — no markers in this packet. Offline tiles — later.

## Acceptance criteria

- WHEN the app is opened in a browser, the system SHALL render a fullscreen night-mode map with OSM/Carto tiles and required attribution.
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
- [ ] Any dead button, link, or form with no real behavior?
- [ ] Any fabricated stat, testimonial, or trust badge?
- [ ] Any screen missing an empty/loading/error state?
- [ ] Any text failing WCAG AA contrast, or any control unreachable by keyboard?

**Code honesty**
- [ ] Any library call you didn't verify against the actual installed version?
- [ ] Any comment that just restates the code, or references a ticket/issue number?
- [ ] Any status reported as "done" without the corresponding command actually being run?

**Security**
- [ ] Any secret reachable from frontend code or a client-exposed env var?
- [ ] Any database table without row-level security / ownership checks in place?
- [ ] Any query built by string-concatenating user input?
- [ ] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build?

**Verification**
- [ ] Did you actually run/build the app (not just read the code) before calling this done?
- [ ] Did you click through every changed interactive element and confirm what happened?
- [ ] For anything you couldn't verify, did you say so explicitly rather than guessing?

## Status

- **State:** in progress
- **Blocked reason (if any):** Waiting on founder click-through of **Load map** and tile pan at `http://localhost:3000`. `npm run build` already passed. No browser automation in this environment.
- **Verify result:** `cd frontend && npm run build` exited 0 (Next.js 14.2.35). Routes: `/` static. Lockfile SWC patch warned (`Cannot read properties of undefined (reading 'os')`) but did not fail the build. `curl http://127.0.0.1:3000` returned the disclaimer and a real **Load map** button. Did not click the button or pan tiles.
- **Delivery Gate:** not yet (verification click-through open)
