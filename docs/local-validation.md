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
```

The repo currently has stable build and preview commands for the browser app:

- backend defaults: `MVIEW_HOST=0.0.0.0`, `MVIEW_PORT=3000`
- web preview for smoke checks: `http://127.0.0.1:4173/`
- auth default: `MVIEW_AUTH_TOKEN=mobile-viewer-dev-token`
- scrcpy runtime prerequisite for live streams: `MVIEW_SCRCPY_SERVER_FILE=/absolute/path/to/scrcpy-server.jar`

## What Works Today

These checks are stable and should be treated as the default automated validation path:

1. `npm run typecheck`
2. `npm run build`
3. Start `npm run preview --workspace web -- --host 127.0.0.1 --port 4173`
4. Confirm `curl http://127.0.0.1:4173/` returns HTML containing `<div id="root"></div>`

If you have a local browser available, you can also open `http://127.0.0.1:4173/` and confirm the built app loads the login shell with the heading `Open the dashboard with the shared token.`

## Live Smoke Prerequisites

The repo does **not** currently contain a checked-in backend launcher, static hosting path, or Vite proxy that makes the browser's relative `/api/*` and `/ws/*` requests reach the Fastify control plane.

That means a fully live dashboard smoke test still depends on an external prerequisite:

- a local command outside the current repo state that starts `buildControlPlaneApp(...)` on `127.0.0.1:3000`
- a same-origin serving or proxy layer so the browser app can reach `/api/session`, `/api/devices`, `/ws/devices`, and `/ws/stream/:serial`

Until that exists, validation should document the gap instead of hardcoding a speculative run command.

## Optional Device Smoke

Once a launcher and same-origin path exist, the next live validation layer should use this order:

1. Start the backend on port `3000`
2. Verify `curl http://127.0.0.1:3000/health`
3. Open the browser UI through the same-origin host
4. Log in with `MVIEW_AUTH_TOKEN`
5. Confirm the dashboard shows either:
   - the empty state for no ADB-visible targets, or
   - one tile per connected Android device or emulator
6. If stream playback is under test, set `MVIEW_SCRCPY_SERVER_FILE` and use either physical ADB hardware or local redroid targets for manual smoke coverage
