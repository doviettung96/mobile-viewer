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

That still does not prove:

- login and logout behavior
- `/api/session` and `/api/devices` correctness
- `/ws/devices` presence updates
- route and selected-device state
- stream rendering and reconnect behavior
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
