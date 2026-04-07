import type {
  DeviceEventEnvelope,
  DeviceListResponse,
  SessionCreateRequest,
  SessionInfo
} from "./contracts.js";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchSession(): Promise<SessionInfo> {
  const response = await fetch("/api/session", {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Session request failed with ${response.status}`);
  }

  return readJson<SessionInfo>(response);
}

export async function createSession(payload: SessionCreateRequest): Promise<SessionInfo> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (response.status === 401) {
    throw new Error("The shared auth token was rejected.");
  }

  if (!response.ok) {
    throw new Error(`Login failed with ${response.status}`);
  }

  return readJson<SessionInfo>(response);
}

export async function destroySession(): Promise<void> {
  const response = await fetch("/api/session", {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Logout failed with ${response.status}`);
  }
}

export async function fetchDevices(): Promise<DeviceListResponse> {
  const response = await fetch("/api/devices", {
    credentials: "include"
  });

  if (response.status === 401) {
    throw new Error("Authentication is required.");
  }

  if (!response.ok) {
    throw new Error(`Device request failed with ${response.status}`);
  }

  return readJson<DeviceListResponse>(response);
}

export function createDeviceEventsSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL("/ws/devices", window.location.href);
  url.protocol = protocol;
  return new WebSocket(url);
}

export function parseDeviceEnvelope(raw: string): DeviceEventEnvelope {
  return JSON.parse(raw) as DeviceEventEnvelope;
}
