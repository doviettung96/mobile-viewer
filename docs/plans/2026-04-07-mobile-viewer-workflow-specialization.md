# Mobile Viewer Workflow Specialization Implementation Plan

> **For agentic workers:** Use Codex subagents when appropriate to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic repo-local validation workflow with `mobile-viewer`-specific instructions that match the current build, preview, and runtime prerequisites.

**Architecture:** Keep the validation contract in `.codex/skills/build-and-test/SKILL.md`, put durable project/runtime notes in `AGENTS.md` and `docs/local-validation.md`, and document the current backend launcher plus same-origin proxy gap explicitly instead of inventing commands that the repo cannot run yet.

**Tech Stack:** npm workspaces, TypeScript, Fastify, Vite, React, ADB, scrcpy

---

### Task 1: Capture the current runtime contract

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/local-validation.md`

- [ ] **Step 1: Record the workspace build and preview commands**
- [ ] **Step 2: Document the default backend and frontend ports plus required environment variables**
- [ ] **Step 3: Call out the missing checked-in backend launcher and same-origin `/api` plus `/ws` path as explicit prerequisites for live smoke testing**

### Task 2: Specialize the repo-local validation skill

**Files:**
- Modify: `.codex/skills/build-and-test/SKILL.md`

- [ ] **Step 1: Replace the stage-1 generic wording with a `mobile-viewer` validation workflow**
- [ ] **Step 2: Define the default automated checks for workspace typecheck, workspace build, and Vite preview smoke**
- [ ] **Step 3: Define when backend health, login, and live ADB or redroid smoke checks are required versus when they remain blocked by missing prerequisites**

### Task 3: Verify the new workflow contract

**Files:**
- Verify only

- [ ] **Step 1: Run the workspace typecheck**
- [ ] **Step 2: Run the workspace build**
- [ ] **Step 3: Start a local Vite preview server and verify the preview root responds**
- [ ] **Step 4: Confirm the specialized skill and runtime docs mention the expected ports, env vars, preview flow, and current live-smoke prerequisites**

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Prerequisites:** `npm` dependencies are installed locally; no checked-in backend launcher or same-origin `/api` plus `/ws` proxy exists yet, so this bead verifies the documented build and preview workflow and records the live-smoke prerequisite instead of pretending to run it.

**Commands:**
- `npm run typecheck`
- `npm run build`
- `PREVIEW_LOG=/tmp/mview-preview.log PREVIEW_HTML=/tmp/mview-preview.html; rm -f "$PREVIEW_LOG" "$PREVIEW_HTML"; npm run preview --workspace web -- --host 127.0.0.1 --port 4173 >"$PREVIEW_LOG" 2>&1 & PREVIEW_PID=$!; trap 'kill $PREVIEW_PID 2>/dev/null || true' EXIT; for i in $(seq 1 30); do if curl -sf http://127.0.0.1:4173/ >"$PREVIEW_HTML"; then break; fi; sleep 1; done; test -s "$PREVIEW_HTML"; rg '<div id=\"root\"></div>' "$PREVIEW_HTML";`
- `rg -n "typecheck|build|preview|4173|3000|MVIEW_AUTH_TOKEN|MVIEW_SCRCPY_SERVER_FILE|backend launcher|same-origin|proxy|adb|redroid" .codex/skills/build-and-test/SKILL.md AGENTS.md docs/local-validation.md docs/plans/2026-04-07-mobile-viewer-workflow-specialization.md -S`

**Success criteria:**
- `npm run typecheck` exits `0`
- `npm run build` exits `0` for all workspaces
- the preview command serves `http://127.0.0.1:4173/` successfully and the returned HTML contains the app root
- the specialized skill and runtime docs contain exact `mobile-viewer` build or preview steps, the `3000` and `4173` defaults, the relevant auth or scrcpy env vars, and an explicit note that live backend or device smoke still depends on a checked-in launcher or same-origin proxy path that does not yet exist
