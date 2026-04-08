# Final Integration E2E Validation Implementation Plan

> **For agentic workers:** Use Codex subagents when appropriate to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current partial runtime into a repo-local end-to-end path, then verify the integrated dashboard against the live backend and available ADB devices.

**Architecture:** Keep the frontend unchanged unless integration bugs force a narrow fix. Add the missing runtime glue on the backend side so one checked-in server process can expose the Fastify API, WebSocket routes, and the built web app from the same origin. Then update the validation docs and build-and-test contract to match the real runtime and collect evidence from automated and live smoke steps.

**Tech Stack:** TypeScript, Fastify, React, Vite build output, ADB, scrcpy, Docker redroid, curl, Node

---

### Task 1: Add a repo-local same-origin runtime path

**Files:**
- Modify: `server/src/http/app.ts`
- Create: `server/src/http/static.ts`
- Create: `server/src/cli.ts`

- [ ] **Step 1: Inspect the current Fastify app and web build output layout**
- [ ] **Step 2: Add a small static-file helper under `server/src/http/` that can serve `web/dist` assets and fall back to `index.html` for browser routes without intercepting `/api/*`, `/ws/*`, or `/health`**
- [ ] **Step 3: Wire the helper into `buildControlPlaneApp(...)` behind a configuration path that is safe when `web/dist` does not exist**
- [ ] **Step 4: Add a backend CLI entry under `server/src/cli.ts` that loads config, starts the app on `127.0.0.1:3000`, and logs a clear startup line**

### Task 2: Refresh runtime validation guidance to match the real path

**Files:**
- Modify: `.codex/skills/build-and-test/SKILL.md`
- Modify: `docs/local-validation.md`

- [ ] **Step 1: Replace the old “missing checked-in launcher” wording with the exact checked-in runtime path if Task 1 lands successfully**
- [ ] **Step 2: Keep the baseline build and preview floor, but add the new backend-backed verification sequence and the live-stream prerequisites**
- [ ] **Step 3: State explicitly that two ADB-visible devices and a readable `scrcpy-server.jar` are still required for the final playback and control proof**

### Task 3: Run final integration verification and collect evidence

**Files:**
- Modify: `docs/local-validation.md`

- [ ] **Step 1: Run the workspace `typecheck`, `test`, and `build` commands**
- [ ] **Step 2: Launch the checked-in backend entrypoint and verify `/health`, `/api/session`, and `/api/devices` through the same origin**
- [ ] **Step 3: If needed, start a second redroid target and connect it over ADB**
- [ ] **Step 4: If needed, download a local `scrcpy-server.jar` for smoke validation**
- [ ] **Step 5: Use an available local browser or a temporary headless browser tool to prove login, device tile rendering, stream startup, and independent per-device control**
- [ ] **Step 6: If any live prerequisite is missing or unstable, separate environment failure from product defects and record the blocker precisely**

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Prerequisites:**
- `npm install` has already been run
- `adb` is available on `PATH`
- For full live playback and control proof, two ADB-visible devices are required
- For stream startup, `MVIEW_SCRCPY_SERVER_FILE` must point at a readable `scrcpy-server.jar`
- If no local browser binary is installed, a temporary headless browser tool may be used for verification, but its commands must be recorded exactly in the evidence

**Automated build floor:**
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

**Backend-backed integration checks:**
- `SERVER_LOG=/tmp/mview-server.log; rm -f "$SERVER_LOG"; MVIEW_HOST=127.0.0.1 MVIEW_PORT=3000 node server/dist/cli.js >"$SERVER_LOG" 2>&1 & SERVER_PID=$!; trap 'kill $SERVER_PID 2>/dev/null || true' EXIT; for i in $(seq 1 30); do if curl -sf http://127.0.0.1:3000/health >/tmp/mview-health.json; then break; fi; sleep 1; done; test -s /tmp/mview-health.json`
- `curl -sf http://127.0.0.1:3000/health`
- `COOKIE_JAR=/tmp/mview-cookies.txt; rm -f "$COOKIE_JAR"; curl -sf -c "$COOKIE_JAR" -H 'content-type: application/json' -d '{"token":"mobile-viewer-dev-token","userName":"operator"}' http://127.0.0.1:3000/api/session`
- `curl -sf -b "$COOKIE_JAR" http://127.0.0.1:3000/api/devices`

**Live smoke preparation when needed:**
- `docker start tgun-redroid9-08 || true`
- `adb connect localhost:6011 || true`
- `adb devices -l`
- `SCRCPY_SERVER_JAR=/tmp/scrcpy-server-v3.2.jar; test -f "$SCRCPY_SERVER_JAR" || curl -L --fail -o "$SCRCPY_SERVER_JAR" https://github.com/Genymobile/scrcpy/releases/download/v3.2/scrcpy-server-v3.2`

**Success criteria:**
- The workspace typechecks, tests, and builds cleanly
- The repo now has one checked-in backend runtime command that serves the app and backend endpoints from the same origin
- `/health`, `/api/session`, and `/api/devices` all respond successfully against the checked-in runtime
- If two devices plus a readable scrcpy jar are available, the same-origin browser smoke proves login, at least two device tiles, stream startup, and independent control delivery
- If the live prerequisites are still unavailable or unstable, the final report names the exact blocker and distinguishes it from product defects instead of claiming the bead passed
