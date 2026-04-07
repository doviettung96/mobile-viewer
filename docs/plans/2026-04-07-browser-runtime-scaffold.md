# Browser Runtime Scaffold Implementation Plan

> **For agentic workers:** Use Codex subagents when appropriate to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing browser runtime scaffold in `web/` so later frontend beads can build and run an actual browser app instead of a TypeScript library stub.

**Architecture:** Use Vite with React and TypeScript for the `web` workspace. Keep the runtime scaffold intentionally thin: one browser entry HTML file, one React entrypoint, one placeholder app shell, and the minimum config/scripts needed so later dashboard/player beads can fill in real UX without revisiting toolchain setup.

**Tech Stack:** npm workspaces, TypeScript, React, React DOM, Vite, `@vitejs/plugin-react`

---

### Task 1: Add frontend runtime toolchain

**Files:**
- Modify: `web/package.json`
- Modify: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/vite-env.d.ts`

- [ ] **Step 1: Add runtime and build dependencies**

Add React/Vite dependencies and replace the current library-style scripts with browser-app scripts:
- `dev`
- `build`
- `preview`
- `typecheck`

- [ ] **Step 2: Enable JSX and Vite typing**

Update the web TS config for React JSX, browser libs, and Vite env typing.

- [ ] **Step 3: Add browser entry files**

Create `index.html` and `vite.config.ts` so the workspace has a real browser entrypoint and production build path.

### Task 2: Add a minimal executable app shell

**Files:**
- Modify: `web/src/index.ts`
- Create: `web/src/main.tsx`
- Create: `web/src/app/App.tsx`
- Create: `web/src/styles/global.css`

- [ ] **Step 1: Replace the package stub entry**

Move the exported package-stub value out of the runtime path and make the web app boot from `main.tsx`.

- [ ] **Step 2: Add a placeholder React app**

Create a minimal shell that proves the browser runtime works and leaves clear extension points for:
- auth/session flow
- dashboard routes/layout
- device presence UI

- [ ] **Step 3: Add baseline global styles**

Keep styles minimal and functional. This is runtime scaffolding, not the final dashboard design.

### Task 3: Verify the scaffold

**Files:**
- Verify only

- [ ] **Step 1: Install workspace deps**

Run the workspace install to materialize the new frontend toolchain.

- [ ] **Step 2: Run workspace typecheck**

Ensure the scaffold compiles alongside the existing server/shared workspaces.

- [ ] **Step 3: Build the web workspace**

Ensure the new browser app bundle builds successfully.

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Prerequisites:** npm available locally.

**Build/install:**
- `npm install`
- `npm run typecheck`
- `npm run build --workspace web`

**Success criteria:**
- `npm install` exits `0`
- `npm run typecheck` exits `0` for all workspaces
- `npm run build --workspace web` exits `0` and produces a Vite web build
- `web/` now contains an executable browser runtime scaffold rather than only a package stub
