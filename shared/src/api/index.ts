import type { DeviceSerial, DeviceSummary } from "../device-types/index.js";

export interface HealthResponse {
  ok: true;
  version: string;
  adbServerHost: string;
  adbServerPort: number;
}

export interface SessionInfo {
  authenticated: boolean;
  userName?: string;
  expiresAt?: string;
}

export interface SessionCreateRequest {
  token: string;
  userName?: string;
}

export interface DeviceListResponse {
  devices: DeviceSummary[];
}

export type DeviceEventType = "snapshot" | "added" | "updated" | "removed";

export interface DeviceSnapshotEvent {
  type: "snapshot";
  devices: DeviceSummary[];
}

export interface DeviceUpsertEvent {
  type: "added" | "updated";
  device: DeviceSummary;
}

export interface DeviceRemovedEvent {
  type: "removed";
  serial: DeviceSerial;
}

export type DeviceEvent =
  | DeviceSnapshotEvent
  | DeviceUpsertEvent
  | DeviceRemovedEvent;

export interface DeviceEventEnvelope {
  channel: "devices";
  event: DeviceEvent;
}
