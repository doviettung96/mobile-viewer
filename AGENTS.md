# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

## Build & Test

```bash
npm install
npm run typecheck
npm run build
npm run preview --workspace web -- --host 127.0.0.1 --port 4173
curl -I http://127.0.0.1:4173/
MVIEW_HOST=127.0.0.1 MVIEW_PORT=3000 npm run start --workspace @mobile-viewer/server
./scripts/posix/start-runtime-container.sh
```

For live browser and device smoke work, also read `docs/local-validation.md`. The repo now ships a checked-in backend launcher that serves the built web app, `/api/*`, and `/ws/*` from the same origin on port `3000`, and a checked-in Compose launch path that runs the same runtime contract inside a container.

The workspace build and preview commands are the baseline validation floor only. They prove the repo still compiles and serves the browser shell, but they do not by themselves prove auth, device state, stream playback, container runtime wiring, or control interaction logic.

For responsive dashboard work, also run `npm run test --workspace web`. The checked-in Playwright coverage exercises `390x844`, `820x1180`, and a small-laptop viewport so the compact preview, expanded viewer, and overflow checks stay regression-tested.

## Architecture Overview

`mobile-viewer` is a TypeScript npm workspace. `shared/` exports API and stream contracts, `server/` contains the Fastify control plane plus ADB or scrcpy integration, and `web/` contains the Vite or React dashboard that consumes the shared contracts.

The browser runtime uses relative `/api/*` and `/ws/*` paths. The checked-in server launcher serves `web/dist` from the same Fastify process so the browser can reach the control-plane and stream routes on one origin during local validation.

## Conventions & Patterns

- Keep cross-runtime types in `shared/` and import them rather than duplicating request or websocket payload shapes.
- Use workspace-level `npm run typecheck` and `npm run build` as the default validation floor for repo changes.
- For beads that change session state, device presence, stream display, manual input behavior, or container runtime wiring, require runtime evidence beyond the build floor. Do not accept build-only verification for those cases.
- For beads that change responsive dashboard behavior, require automated Playwright evidence beyond the build floor. Do not treat preview-only validation as enough for phone or tablet layout changes.
- When documenting or validating runtime behavior, use the concrete defaults already present in code: backend port `3000`, Vite preview port `4173`, `MVIEW_AUTH_TOKEN`, `MVIEW_SCRCPY_SERVER_FILE`, and the host ADB routing default of `host.docker.internal` from `server/src/config/index.ts` and `compose.yaml`.
- If a live smoke path is still blocked by environment prerequisites such as missing ADB devices, a missing scrcpy server jar, a missing Playwright browser binary, or a plain-LAN secure-context limitation on `phone` or `tablet` smoke, document that blocker explicitly instead of inventing a speculative pass.

<!-- BEGIN TEMPLATE BD WORKFLOW -->
## Workflow Guide

Use `BEADS_WORKFLOW.md` for the current planner, manual executor, and swarm executor flow. All workflow skills are repo-local: Codex skills live under `.codex/skills/`, Claude skills under `.claude/skills/`.

Preferred entry points are `plan-beads`, `swarm-epic`, and `executor-once`. Use `planner-research` only inside a planner session when `brainstorming` still leaves material factual uncertainty. Use `executor-loop` or `executor-loop-epic` for sequential autonomy when swarm coordination is not needed.

The executor test skill lives at `.codex/skills/build-and-test/SKILL.md`; use it between implementation and final verification.

Use `scripts/windows/workflow-status.ps1` or `scripts/posix/workflow-status.sh` to inspect `.beads/workflow/`, the shared control plane, and Beads backend state. Use `scripts/windows/agent-mail.ps1` or `scripts/posix/agent-mail.sh` for shared epic locks, reservations, and mailbox inspection.

## Issue Tracking With `bd`

- Use `bd` for all issue tracking
- Do not use markdown TODO files, TodoWrite, or alternate trackers
- Live `.beads` state is local-only and should not be committed
- Run one top-level epic executor session at a time in a checkout

## Essential Commands

```bash
bd ready --json
bd show <id> --json
bd create --title="Summary" --description="Details" --type=task|bug|feature|epic --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd dep add <child-id> <parent-id>
git checkout -b epic/<epic-id>
```

## Notes

- Epics must use `--type=epic`
- Check `bd ready` before asking what to work on next
- `swarm-epic` may coordinate workers inside one epic, but only the coordinator updates bead status during swarm execution
- If the current checkout cannot open the Beads database, inspect `bd where` and run `bd bootstrap --yes` before continuing
<!-- END TEMPLATE BD WORKFLOW -->
