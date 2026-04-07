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
