import { DefaultServerPath } from "@yume-chan/scrcpy";

export interface ServerConfig {
  host: string;
  port: number;
  authToken: string;
  sessionCookieName: string;
  sessionTtlMs: number;
  adbPath: string;
  adbServerHost: string;
  adbServerPort: number;
  devicePollMs: number;
  scrcpyServerFile: string | undefined;
  scrcpyServerPath: string;
  streamIdleTimeoutMs: number;
  streamReconnectDelayMs: number;
  appVersion: string;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: env.MVIEW_HOST ?? "0.0.0.0",
    port: parseNumber(env.MVIEW_PORT, 3000),
    authToken: env.MVIEW_AUTH_TOKEN ?? "mobile-viewer-dev-token",
    sessionCookieName: env.MVIEW_SESSION_COOKIE ?? "mobile_viewer_session",
    sessionTtlMs: parseNumber(env.MVIEW_SESSION_TTL_MS, 1000 * 60 * 60 * 8),
    adbPath: env.MVIEW_ADB_PATH ?? "adb",
    adbServerHost: env.ANDROID_ADB_SERVER_HOST ?? "127.0.0.1",
    adbServerPort: parseNumber(env.ANDROID_ADB_SERVER_PORT, 5037),
    devicePollMs: parseNumber(env.MVIEW_DEVICE_POLL_MS, 2000),
    scrcpyServerFile: env.MVIEW_SCRCPY_SERVER_FILE,
    scrcpyServerPath: env.MVIEW_SCRCPY_SERVER_PATH ?? DefaultServerPath,
    streamIdleTimeoutMs: parseNumber(env.MVIEW_STREAM_IDLE_TIMEOUT_MS, 15_000),
    streamReconnectDelayMs: parseNumber(env.MVIEW_STREAM_RECONNECT_DELAY_MS, 2_000),
    appVersion: env.MVIEW_APP_VERSION ?? "0.0.0"
  };
}
