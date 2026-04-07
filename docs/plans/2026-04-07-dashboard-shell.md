# Dashboard Shell Implementation Plan

> **For agentic workers:** Use Codex subagents when appropriate to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the authenticated frontend dashboard shell, device presence UX, and expanded-device layout scaffold on top of the new browser runtime.

**Architecture:** Keep the frontend shell separate from low-level stream playback. The app will manage session state, fetch devices, subscribe to `/ws/devices`, and render responsive dashboard layouts with a simple route/selection layer so the later player bead can mount into prepared shells instead of driving top-level app structure.

**Tech Stack:** React, Vite, TypeScript, browser Fetch/WebSocket APIs

---

### Task 1: Add session and device data hooks

**Files:**
- Create: `web/src/lib/session/contracts.ts`
- Create: `web/src/lib/session/client.ts`
- Create: `web/src/hooks/useSession.ts`
- Create: `web/src/hooks/useDevicePresence.ts`

- [ ] **Step 1: Define frontend-side HTTP/WS contract types**
- [ ] **Step 2: Implement session API helpers for GET/POST/DELETE**
- [ ] **Step 3: Implement a session hook with loading, login, logout, and error state**
- [ ] **Step 4: Implement a device presence hook with initial fetch plus `/ws/devices` subscription**

### Task 2: Add route and dashboard UI structure

**Files:**
- Create: `web/src/routes/AppRoute.tsx`
- Create: `web/src/routes/useHashRoute.ts`
- Create: `web/src/components/dashboard/CapabilityNotice.tsx`
- Create: `web/src/components/dashboard/LoginPanel.tsx`
- Create: `web/src/components/dashboard/DashboardHeader.tsx`
- Create: `web/src/components/dashboard/DeviceTile.tsx`
- Create: `web/src/components/dashboard/ExpandedDevicePane.tsx`
- Create: `web/src/components/dashboard/EmptyState.tsx`
- Modify: `web/src/app/App.tsx`

- [ ] **Step 1: Add a tiny route/selection layer for dashboard vs expanded-device state**
- [ ] **Step 2: Implement unsupported-browser and insecure-context notice components**
- [ ] **Step 3: Implement login panel and dashboard header**
- [ ] **Step 4: Implement responsive device tiles and expanded-device placeholder pane**
- [ ] **Step 5: Wire the route, session, and device hooks into `App.tsx`**

### Task 3: Add styles for the shell

**Files:**
- Modify: `web/src/styles/global.css`
- Create: `web/src/styles/dashboard.css`
- Modify: `web/src/main.tsx`

- [ ] **Step 1: Keep global reset/base styles**
- [ ] **Step 2: Add focused dashboard layout styles for authenticated, login, empty, and expanded states**
- [ ] **Step 3: Import the dashboard stylesheet**

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Prerequisites:** npm dependencies installed.

**Commands:**
- `npm run test --workspace web --if-present`
- `npm run typecheck`
- `npm run build --workspace web`

**Success criteria:**
- All commands exit `0`
- The web app builds with the new session/device shell files
- The app shows a login shell, authenticated dashboard shell, expanded-device placeholder shell, and capability/insecure-context messaging in the compiled frontend code path
