# Browser Decoder Hardware Preference Fix Plan

**Bead:** `mview-n2c.2`

**Goal:** Remove the browser-side H.264 decoder preference that prevents the same-origin Docker playback smoke from rendering frames in local Chrome headless validation.

**Root Cause:** The frontend forces `hardwareAcceleration: "prefer-hardware"` in `web/src/player/h264-config.ts`. During final Docker playback validation, the page received a valid AVC decoder configuration and a keyframe over `/ws/stream/localhost:6012`, but Chrome rejected the first frame asynchronously with `Unsupported configuration. Check isConfigSupported() prior to calling configure().` Replaying the captured frame with the same `avcC` description proved that `hardwareAcceleration: "no-preference"` and `hardwareAcceleration: "prefer-software"` both decode successfully in the same browser session.

## Implementation

- [ ] Update `web/src/player/h264-config.ts` so the browser decoder no longer forces `prefer-hardware`.
- [ ] Keep the existing `avcC` description and AVCC sample path unchanged.
- [ ] Refresh `docs/local-validation.md` with the browser-backed Docker playback evidence and the decoder preference note that unblocked it.

## Verification

**Working directory:** `/home/tungace/Projects/mobile-viewer`

**Automated floor:**

- `npm run typecheck`
- `npm run build`

**Runtime verification:**

- `./scripts/posix/start-runtime-container.sh -d`
- `curl -sf http://127.0.0.1:3000/health`
- `node /tmp/mview-cdp-check.mjs normal http://127.0.0.1:3000/`

**Success criteria:**

- The workspace typechecks and builds cleanly.
- The same-origin browser smoke logs in, shows at least two device tiles, opens `localhost:6012`, and reports a `Live` viewer state instead of a decoder error overlay.
- The expanded viewer canvas reports non-zero pixels, proving that decoded frames rendered to the page.
