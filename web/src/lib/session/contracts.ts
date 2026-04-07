export interface SessionInfo {
  authenticated: boolean;
  userName?: string;
  expiresAt?: string;
}

export interface SessionCreateRequest {
  token: string;
  userName?: string;
}

export type DeviceSerial = string;

export interface DeviceSummary {
  serial: DeviceSerial;
  model: string;
  state: "device" | "offline" | "unauthorized";
  transportId?: number;
  displayName?: string;
  isEmulator?: boolean;
  product?: string;
  deviceName?: string;
}

export interface DeviceListResponse {
  devices: DeviceSummary[];
}

export type DeviceEvent =
  | {
      type: "snapshot";
      devices: DeviceSummary[];
    }
  | {
      type: "added" | "updated";
      device: DeviceSummary;
    }
  | {
      type: "removed";
      serial: DeviceSerial;
    };

export interface DeviceEventEnvelope {
  channel: "devices";
  event: DeviceEvent;
}
