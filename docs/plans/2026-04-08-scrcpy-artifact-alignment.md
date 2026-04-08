# Scrcpy Artifact Alignment Implementation Plan

> **For agentic workers:** Use Codex subagents when appropriate to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mismatched Docker-bundled `scrcpy-server.jar` with an artifact that matches the runtime client stack so same-origin Docker playback can produce binary stream frames again.

**Architecture:** Keep the `@yume-chan` package versions unchanged unless the root-cause check disproves the artifact mismatch theory. Treat the checked-in `docker/assets/scrcpy-server.jar` as the narrowest fix surface, then rerun the exact container-backed validation path that previously reached the stream backend but failed before frames were delivered.

**Tech Stack:** TypeScript, npm workspaces, Docker Compose, ADB, scrcpy, Fastify, curl

---

## Chunk 1: Confirm The Runtime Contract

### Task 1: Verify the current client and artifact mismatch

**Files:**
- Inspect: `server/package.json`
- Inspect: `package-lock.json`
- Inspect: `docker/assets/scrcpy-server.jar`
- Inspect: `docs/local-validation.md`

- [ ] **Step 1: Re-read the bead contract and the current blocker evidence**

Run: `bd show mview-n2c.1 --json`
Expected: the bead explicitly names the Docker `scrcpy-server.jar` mismatch as the blocker for `mview-1c6`

- [ ] **Step 2: Confirm the installed runtime client versions**

Run: `npm ls @yume-chan/adb-scrcpy @yume-chan/scrcpy --workspace @mobile-viewer/server`
Expected: the current server workspace resolves the same package versions recorded in `server/package.json` and `package-lock.json`

- [ ] **Step 3: Inspect the checked-in jar packaging details**

Run: `unzip -l docker/assets/scrcpy-server.jar`
Expected: the jar is present and is the artifact copied into the runtime image by `Dockerfile`

- [ ] **Step 4: Verify the runtime bundle path is narrow enough for a targeted fix**

Run: `rg -n "scrcpy-server.jar|MVIEW_SCRCPY_SERVER_FILE" Dockerfile compose.yaml docs/local-validation.md`
Expected: only the Docker/runtime docs and launcher contract point at the baked jar path

## Chunk 2: Replace The Baked Artifact

### Task 2: Update the checked-in Docker scrcpy artifact to the matching version

**Files:**
- Modify: `docker/assets/scrcpy-server.jar`
- Inspect: `Dockerfile`

- [ ] **Step 1: Fetch the matching upstream scrcpy server artifact**

Run: `curl -L --fail -o /tmp/scrcpy-server-v3.3.3 https://github.com/Genymobile/scrcpy/releases/download/v3.3.3/scrcpy-server-v3.3.3`
Expected: a local jar-sized artifact is downloaded successfully

- [ ] **Step 2: Replace the checked-in Docker asset with the matching artifact**

Run: `cp /tmp/scrcpy-server-v3.3.3 docker/assets/scrcpy-server.jar`
Expected: `docker/assets/scrcpy-server.jar` now points at the replacement binary that matches the current client stack

- [ ] **Step 3: Verify the worktree changed only at the intended artifact path for this task**

Run: `git status --short docker/assets/scrcpy-server.jar`
Expected: only the jar path shows as modified for the binary replacement step

## Chunk 3: Re-run Docker Playback Validation

### Task 3: Rebuild the runtime and rerun the blocked stream proof

**Files:**
- Modify: `docs/local-validation.md`

- [ ] **Step 1: Run the workspace validation floor before the runtime smoke**

Run: `npm run typecheck`
Expected: exit 0

- [ ] **Step 2: Build the workspace artifacts used by the runtime image**

Run: `npm run build`
Expected: exit 0

- [ ] **Step 3: Start the checked-in Compose runtime in detached mode**

Run: `./scripts/posix/start-runtime-container.sh -d`
Expected: the runtime container starts and publishes `127.0.0.1:3000`

- [ ] **Step 4: Re-prove same-origin health, auth, and device presence**

Run: `curl -sf http://127.0.0.1:3000/health`
Expected: JSON includes `"ok":true`, `"adbServerHost":"host.docker.internal"`, and `"adbServerPort":5037`

- [ ] **Step 5: Create an authenticated session for the runtime smoke**

Run: `COOKIE_JAR=/tmp/mview-cookies.txt; rm -f "$COOKIE_JAR"; curl -sf -c "$COOKIE_JAR" -H 'content-type: application/json' -d '{"token":"mobile-viewer-dev-token"}' http://127.0.0.1:3000/api/session`
Expected: session JSON is returned and the cookie jar is populated

- [ ] **Step 6: Confirm the container still sees the expected devices**

Run: `COOKIE_JAR=/tmp/mview-cookies.txt; curl -sf -b "$COOKIE_JAR" http://127.0.0.1:3000/api/devices`
Expected: at least the currently visible redroid devices are returned

- [ ] **Step 7: Re-run the stream-path smoke that previously failed before frame delivery**

Run: use the same authenticated websocket or equivalent stream smoke already proven in `mview-1c6` and capture whether binary video packets arrive
Expected: either binary frames are now delivered or a different blocker is captured with exact evidence

- [ ] **Step 8: Capture container log evidence after the rerun**

Run: `docker compose -f compose.yaml logs --tail=200 runtime`
Expected: `[stream]` log lines confirm the session path; if still blocked, the new failure must be recorded exactly

- [ ] **Step 9: Update the validation notes with the new outcome**

Run: edit `docs/local-validation.md`
Expected: the doc records whether the version-mismatch blocker was resolved or replaced by a different blocker

- [ ] **Step 10: Stop the detached runtime after evidence is captured**

Run: `docker compose -f compose.yaml down`
Expected: the runtime container is removed and port `3000` is freed

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Prerequisites:**
- `docker compose` is available
- `adb devices -l` shows at least one reachable device or emulator
- the host ADB daemon is reachable from Docker, typically after `adb -a start-server`

**Commands:**
- `npm ls @yume-chan/adb-scrcpy @yume-chan/scrcpy --workspace @mobile-viewer/server`
- `unzip -l docker/assets/scrcpy-server.jar`
- `curl -L --fail -o /tmp/scrcpy-server-v3.3.3 https://github.com/Genymobile/scrcpy/releases/download/v3.3.3/scrcpy-server-v3.3.3`
- `cp /tmp/scrcpy-server-v3.3.3 docker/assets/scrcpy-server.jar`
- `npm run typecheck`
- `npm run build`
- `./scripts/posix/start-runtime-container.sh -d`
- `curl -sf http://127.0.0.1:3000/health`
- `COOKIE_JAR=/tmp/mview-cookies.txt; rm -f "$COOKIE_JAR"; curl -sf -c "$COOKIE_JAR" -H 'content-type: application/json' -d '{"token":"mobile-viewer-dev-token"}' http://127.0.0.1:3000/api/session`
- `COOKIE_JAR=/tmp/mview-cookies.txt; curl -sf -b "$COOKIE_JAR" http://127.0.0.1:3000/api/devices`
- authenticated websocket smoke against `/ws/stream/<serial>` capturing whether binary frames arrive
- `docker compose -f compose.yaml logs --tail=200 runtime`
- `docker compose -f compose.yaml down`

**Success criteria:**
- the only runtime-contract change needed is the baked jar alignment, not a wider `@yume-chan` stack rewrite
- workspace typecheck and build still pass
- the rebuilt container starts on port `3000` and still serves `/health`, `/api/session`, and `/api/devices`
- the stream-path smoke no longer fails with the old scrcpy server/client version mismatch
- `docs/local-validation.md` records the new Docker playback status with exact evidence, including any remaining blocker if frames still do not arrive
