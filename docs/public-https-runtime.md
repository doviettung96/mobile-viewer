# Public HTTPS Runtime Guide

This guide covers the checked-in Docker Compose deployment for exposing `mobile-viewer` on a public HTTPS origin. Use this path when the browser is on another machine and you need live playback to work without an SSH tunnel.

The public runtime lives in `deploy/public/compose.yaml` and adds a Caddy reverse proxy in front of the existing runtime image. Caddy terminates HTTPS on ports `80` and `443`, obtains certificates automatically, and proxies the app to the internal `runtime:3000` service.

## Why This Path Exists

Browsers usually require a secure origin for WebCodecs and `VideoDecoder`. That means:

- `http://127.0.0.1:3000/` works on the same machine
- `http://<public-ip>:3000/` often loads the dashboard but does not allow live playback
- `https://<public-hostname>/` gives the browser the secure context needed for remote playback

## Prerequisites

- Docker with the Compose plugin available on the host
- inbound TCP `80` and `443` allowed to the host
- if you want HTTP/3, inbound UDP `443` allowed to the host
- a public hostname that resolves to the host
- a running host ADB server reachable from Docker, usually `adb -a start-server`
- a reachable Android device or emulator that the host ADB server can see

If you do not have a regular DNS name yet, you can use `sslip.io` for IP-derived hostnames, for example:

```bash
<public-ip>.sslip.io
```

For a host with public IP `203.0.113.10`, that would be:

```bash
203.0.113.10.sslip.io
```

## Configure The Deployment

Copy the example env file:

```bash
cp deploy/public/.env.example deploy/public/.env
```

Set at least:

- `MVIEW_PUBLIC_HOSTNAME` to the hostname users will open in the browser
- `MVIEW_AUTH_TOKEN` to a strong shared token

The default ADB settings in the example file assume the host daemon is reachable from the container at `host.docker.internal:5037`.

## Start The Public Runtime

Use the checked-in launcher:

```bash
./scripts/posix/start-public-runtime-container.sh -d
```

That command:

- builds the existing runtime image from the repo `Dockerfile`
- starts the internal `runtime` service without publishing port `3000`
- starts Caddy on `80` and `443`
- requests TLS certificates for `MVIEW_PUBLIC_HOSTNAME`

If you need a different env file location, set `MVIEW_ENV_FILE` before running the script.

## Host ADB Setup

On Linux, start the host daemon so the container can reach it:

```bash
adb -a start-server
```

If your redroid instance is exposed on a TCP port, connect it to the host daemon before starting or testing the app:

```bash
adb connect <reachable-host>:<redroid-port>
adb devices -l
```

For a local redroid Docker container published on `5555`, that is commonly:

```bash
adb connect 127.0.0.1:5555
adb devices -l
```

## Verify The Deployment

Check HTTPS health:

```bash
curl -I https://<public-hostname>/health
```

Create a session:

```bash
curl -c cookies.txt \
  -H 'content-type: application/json' \
  -d '{"token":"<your-token>","userName":"remote"}' \
  https://<public-hostname>/api/session
```

Check device discovery:

```bash
curl -b cookies.txt https://<public-hostname>/api/devices
```

Then open:

```bash
https://<public-hostname>/
```

## Operations

Start or update:

```bash
./scripts/posix/start-public-runtime-container.sh -d
```

Stop:

```bash
docker compose -p mobile-viewer-public --env-file deploy/public/.env -f deploy/public/compose.yaml down
```

Logs:

```bash
docker compose -p mobile-viewer-public --env-file deploy/public/.env -f deploy/public/compose.yaml logs -f
```

## Security Notes

- anyone who can reach the hostname can load the login page, so keep `MVIEW_AUTH_TOKEN` private
- Caddy will only obtain certificates if `MVIEW_PUBLIC_HOSTNAME` resolves to this host and ports `80` and `443` are reachable from the internet
- if you rotate the auth token, restart the stack after updating `deploy/public/.env`
