# Container Runtime Operator Guide

This guide covers the checked-in compose runtime started from `compose.yaml` on port `3000`. The container serves the UI and API from one origin, while the containerized server reaches the host ADB server through `host.docker.internal` and the `host-gateway` mapping defined in the compose file.

## Prerequisites

- Docker with the Compose plugin available on the host
- A running host ADB server listening on `0.0.0.0:5037` or another address reachable from the container bridge
- An accessible network path to the host for the browser on `3000`
- For live stream playback, a reachable Android device or emulator that the host ADB server can see, plus the baked `scrcpy-server.jar` in the runtime image
- If you are not using the default login token, set `MVIEW_AUTH_TOKEN` in a local `.env` file before starting the container

On Linux, the simplest way to satisfy the ADB prerequisite is:

```bash
adb -a start-server
```

Starting ADB without `-a` may leave it bound to `127.0.0.1:5037`, which makes `host.docker.internal:5037` fail from inside the runtime container even though the host can see the devices locally.

The checked-in runtime starter on Linux is:

```bash
./scripts/posix/start-runtime-container.sh
```

That wrapper runs `docker compose -f compose.yaml up --build` from the repo root.

## Start The Runtime

Use the repo-local launcher when possible:

```bash
./scripts/posix/start-runtime-container.sh
```

If you need detached mode or custom flags, use the compose file directly:

```bash
docker compose -f compose.yaml up --build -d
```

The runtime container publishes `3000:3000` and injects these defaults from `.env.example` and `compose.yaml`:

- `MVIEW_HOST=0.0.0.0`
- `MVIEW_PORT=3000`
- `MVIEW_AUTH_TOKEN=mobile-viewer-dev-token`
- `ANDROID_ADB_SERVER_HOST=host.docker.internal`
- `ANDROID_ADB_SERVER_PORT=5037`

## LAN Access

If the host is reachable on the local network, open the UI with:

```bash
http://<host-lan-ip>:3000/
```

Make sure the host firewall allows inbound TCP traffic on `3000`. The browser should reach the same origin that serves `/api/*` and `/ws/*`, so no extra reverse proxy is required for this path.

## Tailscale Access

If the host is on your tailnet, use the host's Tailscale address or MagicDNS name:

```bash
tailscale ip -4
```

Then open:

```bash
http://<tailscale-ip>:3000/
```

If you prefer MagicDNS, the same browser URL works with the host name instead of the numeric Tailscale IP. The important detail is that the browser still points at port `3000` on the host, not at the container directly.

## SSH Tunnel Access

When the host is only reachable over SSH, tunnel the UI port back to your workstation:

```bash
ssh -L 3000:127.0.0.1:3000 user@host
```

With that tunnel open, browse to:

```bash
http://127.0.0.1:3000/
```

This is the safest fallback when LAN or Tailscale exposure is not available. The tunnel carries the same-origin browser traffic without changing the runtime contract.

## Direct ADB Access

The container reaches the host's ADB server through `host.docker.internal:5037`. That means the host ADB server still needs to see the device or emulator you want to control.

If `/api/devices` fails from the container with `Connection refused` for `host.docker.internal:5037`, restart the host daemon with:

```bash
adb kill-server
adb -a start-server
```

If a redroid or emulator instance exposes its own TCP ADB endpoint on a reachable machine, connect to it directly from the operator workstation:

```bash
adb connect <reachable-host>:<redroid-port>
adb devices
```

If that endpoint is only available on the host, forward it over SSH first and then connect locally:

```bash
ssh -L <local-redroid-port>:127.0.0.1:<redroid-port> user@host
adb connect 127.0.0.1:<local-redroid-port>
adb devices
```

Use the direct `adb connect` path for the device endpoint itself. Do not point `adb connect` at the runtime container's `3000` UI port.

## Operator Checks

Before handing the machine to another operator, confirm the following:

1. The container starts cleanly with `./scripts/posix/start-runtime-container.sh`
2. The UI loads from `http://<host-lan-ip>:3000/`, `http://<tailscale-ip>:3000/`, or `http://127.0.0.1:3000/` through an SSH tunnel
3. The login token matches the `.env.example` default or the custom `MVIEW_AUTH_TOKEN` you chose
4. The host ADB server can see the target device or emulator
5. If stream playback is needed, the runtime image still contains the baked scrcpy artifact and the target is visible to ADB

If any live prerequisite is missing, document the blocker explicitly instead of implying the operator flow was verified.

## Validation Notes

Validated locally on April 8, 2026:

- `docker compose up -d --build` started the checked-in runtime on port `3000`
- `curl -sf http://127.0.0.1:3000/health` returned the compose-wired ADB host `host.docker.internal` and port `5037`
- session creation through `/api/session` succeeded with `MVIEW_AUTH_TOKEN=mobile-viewer-dev-token`
- `/api/devices` returned two redroid devices after starting the host daemon with `adb -a start-server`

Not validated in this session:

- remote UI access from a second LAN, Tailscale, or SSH client machine
- direct `adb connect <reachable-host>:<redroid-port>` coexistence from that second machine

Those remote checks remain environment-dependent and should be treated as pending operator smoke unless a second reachable client machine is available.
