# Local Validation

This project is a TypeScript workspace with three packages:

- `shared/` contains API and stream contracts used by both runtimes.
- `server/` contains the Fastify control plane plus ADB and scrcpy integration.
- `web/` contains the Vite and React dashboard runtime.

## Stable Commands

Run these from `/home/tungace/Projects/mobile-viewer`:

```bash
npm run typecheck
npm run build
npm run preview --workspace web -- --host 127.0.0.1 --port 4173
MVIEW_HOST=127.0.0.1 MVIEW_PORT=3000 npm run start --workspace @mobile-viewer/server
./scripts/posix/start-runtime-container.sh
```

The repo currently has stable build, preview, same-origin backend, and Compose runtime commands:

- backend defaults: `MVIEW_HOST=0.0.0.0`, `MVIEW_PORT=3000`
- web preview for smoke checks: `http://127.0.0.1:4173/`
- auth default: `MVIEW_AUTH_TOKEN=mobile-viewer-dev-token`
- scrcpy runtime prerequisite for live streams: `MVIEW_SCRCPY_SERVER_FILE=/absolute/path/to/scrcpy-server.jar`
- Compose runtime source of truth: `compose.yaml` and `./scripts/posix/start-runtime-container.sh`
- container runtime defaults: `MVIEW_PORT=3000`, `MVIEW_AUTH_TOKEN=mobile-viewer-dev-token`, `ANDROID_ADB_SERVER_HOST=host.docker.internal`, and `MVIEW_SCRCPY_SERVER_FILE=/app/docker/assets/scrcpy-server.jar`

These commands are the baseline validation floor. They prove compile, bundle, and preview health, but not the full app behavior or the container runtime wiring.

## What Works Today

These checks are stable and should be treated as the default automated validation path:

1. `npm run typecheck`
2. `npm run build`
3. Start `npm run preview --workspace web -- --host 127.0.0.1 --port 4173`
4. Confirm `curl http://127.0.0.1:4173/` returns HTML containing `<div id="root"></div>`
5. Run `npm run test --workspace web` to exercise the responsive Playwright coverage for `390x844`, `820x1180`, and a small-laptop viewport

If the local machine has not installed the Playwright browser binary yet, install it once with `npx playwright install chromium` before rerunning the web test command. Treat that as machine setup, not as a repo guarantee.

If you have a local browser available, you can also open `http://127.0.0.1:4173/` and confirm the built app loads the login shell with the heading `Open the dashboard with the shared token.`

For backend-backed validation, build the repo first and then start:

```bash
MVIEW_HOST=127.0.0.1 MVIEW_PORT=3000 npm run start --workspace @mobile-viewer/server
```

That checked-in launcher serves the built web app plus `/api/*` and `/ws/*` from the same origin at `http://127.0.0.1:3000/`.

For container-backed validation, use the checked-in Compose path when your local environment has a working Compose CLI:

```bash
./scripts/posix/start-runtime-container.sh
```

That path is the runtime contract for the container image and exposes the same-origin app on port `3000` with host ADB routing via `host.docker.internal`. If `docker compose` is unavailable locally, treat that as an environment blocker for container smoke rather than a repo failure.
On Linux, if the container cannot reach the host ADB daemon through `host.docker.internal:5037`, restart the host daemon with `adb -a start-server` before retrying `/api/devices`.

### Docker Playback Status On April 8, 2026

The container-backed validation run for epic `mview-n2c` proved the following on `http://127.0.0.1:3000/`:

- `npm run typecheck` passed
- `npm run build` passed
- `./scripts/posix/start-runtime-container.sh -d` built and started `mobile-viewer-runtime-1`
- `curl -sf http://127.0.0.1:3000/health` returned `{"ok":true,"adbServerHost":"host.docker.internal","adbServerPort":5037,...}`
- `POST /api/session` with `MVIEW_AUTH_TOKEN=mobile-viewer-dev-token` returned an authenticated session and set the cookie
- authenticated `GET /api/devices` returned two redroid devices: `localhost:6012` and `localhost:6013`
- an authenticated websocket connection to `/ws/stream/localhost:6012` created a stream session and reached the new `[stream]` logging path inside the container
- the websocket stream delivered binary video packets after the baked Docker `scrcpy-server.jar` was realigned with the runtime client stack
- container logs showed normal scrcpy startup, including `scrcpy client started`, `video stream acquired`, and server-side encoder output
- headless Chrome smoke via `node /tmp/mview-cdp-check.mjs normal http://127.0.0.1:3000/` logged in successfully, rendered two device tiles, opened `localhost:6012`, reached `status: "Live"`, and observed non-zero pixels on the expanded viewer canvas
- the browser playback fix was to stop forcing `hardwareAcceleration: "prefer-hardware"` in `web/src/player/h264-config.ts`; replaying the captured frame in the same session proved that `no-preference` and `prefer-software` decode successfully while `prefer-hardware` fails asynchronously in this environment
- the previous browser failure state also showed the stream error overlay clearly with the message `Unsupported configuration. Check isConfigSupported() prior to calling configure().`

This now proves the same-origin Docker runtime all the way through browser frame rendering for the local validation environment used on April 8, 2026.

That proof is specifically for `http://127.0.0.1:3000/`. Accessing the same service over a plain-LAN origin such as `http://192.168.1.8:3000/` is still expected to lose `VideoDecoder` in many browsers because that origin is not a secure context. In that case the dashboard and auth flow may still work, but live playback will require HTTPS or another secure-origin setup before WebCodecs can decode video frames.

That still does not prove:

- login and logout behavior
- `/api/session` and `/api/devices` correctness
- `/ws/devices` presence updates
- route and selected-device state
- reconnect behavior
- pointer, wheel, or keyboard control delivery
- container runtime wiring beyond the baked defaults listed above

## Live Smoke Prerequisites

The repo now contains the same-origin launcher path, but full live playback and control still depend on environment prerequisites:

- at least one ADB-visible device for device-presence validation
- at least two ADB-visible devices for multi-device tile and independent-control validation
- `MVIEW_SCRCPY_SERVER_FILE` set to a readable scrcpy server binary for `/ws/stream/:serial`
- a local browser or temporary headless browser tool for real UI validation

For downstream implementation beads in this repo, that means:

- build-only evidence is acceptable for docs, workflow, and pure compile-time refactors
- backend-backed runtime evidence is required for auth, state, and device-presence behavior
- live device evidence is required for playback and control behavior when the bead's acceptance depends on it

## Device Smoke

Use this order for live validation:

1. Start the backend on port `3000`
2. Verify `curl http://127.0.0.1:3000/health`
3. Log in through `http://127.0.0.1:3000/` with `MVIEW_AUTH_TOKEN`
4. Confirm `/api/session`, `/api/devices`, and `/ws/devices` work against that same origin
5. Confirm the dashboard shows either:
   - the empty state for no ADB-visible targets, or
   - one tile per connected Android device or emulator
6. If stream playback is under test, set `MVIEW_SCRCPY_SERVER_FILE` and use either physical ADB hardware or local redroid targets for manual smoke coverage
7. For the multi-device viewer bead, verify two tiles render and that control sent to one device does not change the other device
8. For container-runtime validation, run `./scripts/posix/start-runtime-container.sh`, confirm the app is reachable on `http://127.0.0.1:3000/`, and note the local Compose CLI version only as environment context, not as a repo guarantee
9. If the container uses `host.docker.internal` for ADB, make sure the host daemon is listening beyond loopback, for example with `adb -a start-server`, before treating `/api/devices` failures as an app bug

For phone or tablet smoke on a LAN host, be explicit about the secure-context limit: if the origin is plain HTTP and the browser cannot expose `VideoDecoder` or stream playback, record that as the blocker rather than claiming the responsive smoke passed. The responsive Playwright suite still covers `390x844`, `820x1180`, and the small-laptop viewport on the local machine even when live LAN playback is blocked.

## Current Responsive Validation Notes

- The final responsive integration gate passed locally on April 8, 2026 with the automated Playwright coverage for `390x844`, `820x1180`, and a small-laptop viewport.
- No real LAN phone or tablet was available in this environment, so live small-screen smoke on `http://<reachable-host>:3000/` remains blocked here.
- If `MVIEW_HOST=0.0.0.0 MVIEW_PORT=3000 npm run start --workspace @mobile-viewer/server` returns `EADDRINUSE`, confirm the already-running same-origin server with `curl http://127.0.0.1:3000/health` before treating it as a repo failure.
