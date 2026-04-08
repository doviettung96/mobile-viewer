---
name: build-and-test
description: "Use after implementing changes to run the mobile-viewer validation flow from the current execution plan, including workspace build, Vite preview smoke, and any plan-defined backend or device checks."
---

# Build And Test

**Workflow position:** Executor session, between implementation (step 3) and verification (step 6). See BEADS_WORKFLOW.md.

Validate only the components affected by the current changes, but use the concrete `mobile-viewer` runtime defaults instead of a stage-1 generic workflow.

`mobile-viewer` is a TypeScript workspace:

- `shared/` provides API and stream contracts
- `server/` provides the Fastify control plane and ADB or scrcpy integration
- `web/` provides the Vite or React dashboard runtime

The stable automated validation floor for this repo is:

1. `npm run typecheck`
2. `npm run build`
3. `npm run preview --workspace web -- --host 127.0.0.1 --port 4173`
4. smoke-check `http://127.0.0.1:4173/`

Use those defaults unless the current execution plan tightens them further.

That floor proves the repo still compiles, bundles, and serves a browser shell. It does **not** by itself prove that the app's real behavior works.

For `mobile-viewer`, the end goal is correct:

- display of device and stream state
- interaction with the selected device
- state management across auth, presence, routing, streaming, and reconnect paths

Any bead that changes one of those behaviors must require runtime evidence above the baseline floor.

## Core Rules

- Run the **exact commands** from the current plan's `## Verification` section.
- Prefer the repo's concrete defaults: backend `3000`, preview `4173`, auth token `MVIEW_AUTH_TOKEN`, and scrcpy server jar via `MVIEW_SCRCPY_SERVER_FILE`.
- Do not invent a backend launch or proxy command that the repo does not actually contain.
- The repo's checked-in backend launcher is `MVIEW_HOST=127.0.0.1 MVIEW_PORT=3000 npm run start --workspace @mobile-viewer/server` after `npm run build`.
- Treat `typecheck`, `build`, and preview smoke as the minimum floor, not as sufficient proof for auth, device state, stream playback, input, or cross-runtime state logic.
- When a bead changes display logic, interaction logic, or state transitions, the verification contract must require runtime evidence for that behavior or the bead must stop as blocked.

## Steps

### 1. Find the test plan

Read the `## Verification` section of the current execution plan saved in `docs/plans/`.

That section must tell you:

- what workspace commands to build or typecheck
- whether a Vite preview smoke check is required
- whether a backend launch command exists for this bead
- whether behavior-level checks are required for auth, device presence, route state, stream playback, or control input
- whether live browser, ADB, or redroid smoke checks are required
- what output or observed behavior counts as success

If there is no plan file, or the plan has no usable `## Verification` section, stop and say the plan must be updated before `build-and-test` can run.

### 2. Detect what changed

```bash
git diff --name-only HEAD
```

If nothing staged, also check unstaged:

```bash
git diff --name-only
```

### 3. Map the changes to the validation depth

Use the change list plus the verification plan to decide what to run.

| Changed path | Action |
|---|---|
| Only docs, bead metadata, or notes changed | Run the exact plan checks. For workflow or runtime-note changes, that usually still means workspace `typecheck`, workspace `build`, web preview smoke, and documentation grep or inspection because the docs are defining executable process. |
| `shared/**`, `server/**`, or `web/**` changed | Run workspace `typecheck` and workspace `build`, then any additional commands from the plan. |
| `web/**` changed | Include the Vite preview smoke check unless the plan says it is intentionally out of scope. |
| session, auth, route, device-presence, or websocket state paths changed | Require backend-backed verification for login, `/api/session`, `/api/devices`, `/ws/devices`, route selection, or reconnect behavior. Build and preview alone are not enough. |
| stream player, decode, viewport, coordinate-map, or control-input paths changed | Require live runtime evidence for playback or control behavior. Build and preview alone are not enough. |
| backend runtime or auth paths changed and the plan includes a launcher command | Run the backend command, then hit `/health` and any plan-defined session or websocket smoke checks. |
| stream, ADB, or scrcpy paths changed | Run the plan's live smoke steps when the required environment exists. If the bead's acceptance depends on that behavior and the environment is absent, treat it as blocked rather than silently downgrading to build-only checks. |

### 4. Validate the verification contract before running anything

Before executing commands, confirm the plan is specific enough.

For this repo, the `## Verification` section should include exact commands and expected evidence, such as:

- working directory when it matters
- required env vars such as `MVIEW_AUTH_TOKEN` or `MVIEW_SCRCPY_SERVER_FILE`
- workspace build commands
- preview or backend launch commands
- URLs and ports such as `127.0.0.1:4173` or `127.0.0.1:3000`
- smoke-test commands such as `curl`, browser checks, or ADB inspection
- which behavioral layer is being proven: compile, auth state, device presence, route state, stream display, or user interaction
- success criteria written as observed output or behavior

If the plan says vague things like "run the app" or "make sure it works," stop and send the work back to `writing-plans` to tighten the verification section.

If the plan only lists baseline compile or preview checks for a bead that changes auth, presence, display, stream, or interaction logic, stop and send it back to `writing-plans`. The plan is too weak for this repo.

### 5. Run the plan's verification commands in order

Use the commands exactly as written in the current plan.

Typical `mobile-viewer` verification flows include:

- `npm run typecheck`
- `npm run build`
- `npm run preview --workspace web -- --host 127.0.0.1 --port 4173`
- `curl http://127.0.0.1:4173/`
- if the plan provides a backend launch command, `MVIEW_HOST=127.0.0.1 MVIEW_PORT=3000 npm run start --workspace @mobile-viewer/server`
- `curl http://127.0.0.1:3000/health`
- if the bead changes auth or dashboard state, browser or API evidence for `/api/session`, `/api/devices`, and `/ws/devices`
- if the bead changes stream or control behavior, live device evidence for frame display, selection state, and manual input
- if the plan explicitly requires live device coverage and the prerequisite environment exists, manual smoke against ADB-visible hardware or redroid

When the plan requires manual observation, record what you actually saw. Do not replace it with a lighter automated check unless the plan explicitly allows that.

If the bead touches workflow or docs only, it is valid for the plan to stop at workspace build plus preview smoke plus documentation verification. Do not fabricate stream or device checks when the needed ADB devices, scrcpy server binary, or browser runtime are unavailable.

### 6. Capture evidence while running

For each verification command, note:

- the command you ran
- exit code
- relevant output
- any observed UI behavior or logs the plan required
- whether the result matched the stated success criteria

Do not summarize failed checks as "mostly passed." Report the failing step precisely.

### 7. Report results

State exactly what was validated and what evidence you saw.

Minimum report contents:

- changed areas that triggered validation
- verification commands executed
- observed outputs and behavior
- pass/fail status for each major check
- blockers or plan gaps, if any
- whether the evidence only proves the baseline floor or also proves runtime behavior
- whether backend or device smoke was executed, skipped as optional, or blocked by a missing repo prerequisite

Do NOT claim success without evidence.

### 8. Behavior Decision Gate

Use this gate before accepting build-only evidence:

- If the current bead only changes docs, workflow, or compile-time code paths, build plus preview evidence can be enough when the plan says so.
- If the current bead changes session, auth, dashboard state, device presence, route state, websocket handling, or other cross-runtime logic, require backend-backed runtime evidence through the checked-in same-origin launcher on port `3000`.
- If the current bead changes stream playback, viewport rendering, input mapping, or control dispatch, require live device evidence. If the required ADB or redroid environment is unavailable and the bead's acceptance depends on that behavior, stop and report a blocker.
- If a launcher command and same-origin path are available, run the backend and browser checks instead of downgrading them.

## Fix-And-Retry Loop

If validation fails or behavior is wrong, do NOT proceed to final verification. Instead:

1. Fix the code or the verification plan
2. Re-run `build-and-test`
3. Repeat until the checks pass

```
implement → build-and-test → FAIL → fix code → build-and-test → PASS → verification
```

Only proceed to final verification when `build-and-test` passes.

## Skip Conditions

Do NOT trigger this skill when:

- the user explicitly says no testing is needed
- in a planner session
- only planner artifacts changed and the current plan does not require validation
