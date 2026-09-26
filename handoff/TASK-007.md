# TASK-007: Hold-to-trigger SOS

> Packet for PH-02 `F-004`. Client-only. Do not auto-dial 911. Do not persist GPS (`INV-002`).

## Reference

- **Phase:** PH-02
- **Feature(s):** F-004
- **Invariant(s) this must respect:** INV-002, INV-AS-004, INV-AS-005
- **Anti-slop:** read `docs/anti-slop-guardrails.md` before writing code or UI

## Scope — what this task IS

Add an SOS control that arms only after a 1.5 s hold, then plays a Web Audio siren, strobes the screen, offers a one-tap `sms:` alert with an OpenStreetMap link, and silences only after a 2 s cancel slide.

## Scope — what this task is NOT

- No PNP/911 auto-dial APIs, no stored emergency contacts, no barangay portal.
- No server logging of live GPS.

## Write scope

- `handoff/TASK-007.md`
- `docs/implementation-plan.md` (status / run log only)
- `frontend/lib/sos.ts`
- `frontend/app/components/SosControl.tsx`
- `frontend/app/components/MapExperience.tsx`
- `frontend/app/globals.css`
- `frontend/scripts/test-sos.js`
- `frontend/package.json` (`test:sos`)
- **Do not touch:** `seed/`, `work/`, `backend/.env.local`

## Spec

- **Signature(s):** Hold 1500 ms to activate. `startSiren(AudioContext)` / `stop`. `sosSmsHref(lat?, lng?)` → `sms:?body=`. Cancel slide must stay engaged for 2000 ms.
- **Data shape(s):** SMS body is a help line plus OSM `mlat`/`mlon` when coords exist. Location stays in component state.
- **Edge cases:** Release before 1.5 s does nothing. No `AudioContext` → visible error, still show SMS. GPS denied → SMS without a pin, copy-to-clipboard fallback (SDD).
- **Deferred:** Auto-dial, contact directory, downloaded mp3 (oscillator is the SDD primary path).

## Acceptance criteria

- WHEN the user presses and holds the SOS button for 1.5 seconds, the system SHALL trigger an emergency alarm state.
- WHEN the emergency state activates, the system SHALL sound a continuous siren and flash the screen at high brightness.
- WHEN the emergency state activates, the system SHALL render a 1-tap Send SMS Alert control with GPS and an OpenStreetMap URL when location is available.
- WHEN the user uses Cancel Alert, the system SHALL require a 2-second confirmation slide to silence the alarm.
- WHEN `cd frontend && npm run test:sos` is run, the command SHALL exit 0.

## Verify command

```
cd frontend && npm run test:sos
```

## Delivery Gate

**Hard Gate**
- [x] Any dead button, link, or form with no real behavior? No. Hold arms SOS. SMS opens `sms:`. Copy writes the same body. Cancel slide silences after 2 s.
- [x] Any fabricated stat, testimonial, or trust badge? No. No 911/dispatch claim. Location omitted when GPS is missing.
- [x] Any screen missing an empty/loading/error state? No. GPS loading/error, siren error, copy error.
- [x] Any text failing WCAG AA contrast, or any control unreachable by keyboard? No. Hold via Space/Enter; SMS/copy/slide are keyboard-reachable; focus rings.

**Code honesty**
- [x] Any library call you didn't verify against the actual installed version? No. `AudioContext.createOscillator` / `OscillatorNode.frequency.setValueAtTime` (Web Audio). `sms:?body=` (SDD).
- [x] Any comment that just restates the code, or references a ticket/issue number? No.
- [x] Any status reported as "done" without the corresponding command actually being run? No.

**Security**
- [x] Any secret reachable from frontend code or a client-exposed env var? No.
- [x] Any database table without row-level security / ownership checks in place? No new tables.
- [x] Any query built by string-concatenating user input? No SQL.
- [x] Any debug endpoint, API doc, or source map left publicly reachable in the deployed build? No.

**Verification**
- [x] Did you actually run/build the app (not just read the code) before calling this done? Yes. `test:sos` exit 0. `next build` exit 0.
- [x] Did you click through every changed interactive element and confirm what happened? No. Siren, hold, SMS app, and cancel slide were not exercised in a browser.
- [x] For anything you couldn't verify, did you say so explicitly rather than guessing? Yes. `sms:` behavior depends on the device. AudioContext needs a user gesture (the hold).

## Status

- **State:** done
- **Blocked reason (if any):**
- **Verify result:** `cd frontend && npm run test:sos` exit 0. `npm run build` exit 0.
- **Delivery Gate:** pass (browser hold/siren/SMS/slide unverified)

