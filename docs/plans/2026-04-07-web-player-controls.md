# Web Player And Controls Implementation Plan

> **For agentic workers:** Use Codex subagents when appropriate to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-side stream player that decodes the backend scrcpy video feed with WebCodecs and sends focused manual input back to the selected Android device.

**Architecture:** Keep transport, decode, input mapping, and React rendering separated so the dashboard shell remains a thin composition layer. The browser will open one stream WebSocket per mounted viewer, parse the server's mixed JSON/binary protocol, drive a `VideoDecoder` from scrcpy H.264 packets, and translate pointer and keyboard events into the existing backend control-message schema.

**Tech Stack:** React, TypeScript, Vite, WebSocket, WebCodecs, Canvas 2D, `@yume-chan/scrcpy`

---

### Task 1: Add browser-side stream contracts and packet parsing

**Files:**
- Create: `web/src/lib/stream/contracts.ts`
- Create: `web/src/lib/stream/packet.ts`
- Create: `web/src/lib/stream/client.ts`

- [ ] **Step 1: Define frontend stream event/control types that mirror the backend `/ws/stream/:serial` protocol**
- [ ] **Step 2: Implement binary packet parsing for configuration and data frames from the WebSocket**
- [ ] **Step 3: Implement a stream client helper that opens the per-device socket and separates JSON events from binary video packets**

### Task 2: Add decode/session state management

**Files:**
- Create: `web/src/player/h264-config.ts`
- Create: `web/src/player/stream-session.ts`
- Create: `web/src/player/useDeviceStream.ts`

- [ ] **Step 1: Parse scrcpy H.264 configuration packets into a `VideoDecoderConfig`-ready shape**
- [ ] **Step 2: Implement a stream session that owns the WebSocket, `VideoDecoder`, latest frame canvas state, metadata, and reconnect/reset handling**
- [ ] **Step 3: Expose the player state through a React hook suitable for tile and expanded viewers**

### Task 3: Add coordinate mapping and manual control helpers

**Files:**
- Create: `web/src/lib/input/android.ts`
- Create: `web/src/lib/input/coordinate-map.ts`
- Create: `web/src/lib/input/controls.ts`

- [ ] **Step 1: Define Android key, motion, and button helpers used by the UI**
- [ ] **Step 2: Implement letterbox-aware coordinate mapping from rendered canvas space to device video space**
- [ ] **Step 3: Implement pointer, wheel, and keyboard control message helpers for the active stream session**

### Task 4: Add reusable viewer components and mount them into the dashboard

**Files:**
- Create: `web/src/components/device-viewer/DeviceViewport.tsx`
- Create: `web/src/components/device-viewer/DeviceViewerCard.tsx`
- Modify: `web/src/components/dashboard/DeviceTile.tsx`
- Modify: `web/src/components/dashboard/ExpandedDevicePane.tsx`
- Modify: `web/src/routes/AppRoute.tsx`
- Modify: `web/src/styles/dashboard.css`

- [ ] **Step 1: Build a focusable viewport component that renders the decoded frame canvas plus stream status overlays**
- [ ] **Step 2: Build a reusable viewer wrapper for grid tiles and the expanded pane**
- [ ] **Step 3: Mount lightweight live viewers in the grid and a larger interactive viewer in the expanded route**
- [ ] **Step 4: Add the CSS needed for viewport chrome, focus state, overlays, and responsive video layout**

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Prerequisites:** npm dependencies installed; browser APIs are type-available through the web workspace `DOM` libs.

**Commands:**
- `npm run test --workspace web --if-present`
- `npm run typecheck`
- `npm run build --workspace web`

**Success criteria:**
- All commands exit `0`
- The web package compiles with new stream, decoder, input, and viewer modules
- The dashboard code path now mounts device viewer components into both the tile grid and expanded pane without removing the existing session/device shell
- The compiled frontend includes the WebCodecs stream client path, binary packet parsing, and manual control message generation for the browser player bead
