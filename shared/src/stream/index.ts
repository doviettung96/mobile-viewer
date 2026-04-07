import type { DeviceSerial } from "../device-types/index.js";

export type StreamPacketKind = "configuration" | "data";
export type StreamControlKind =
  | "key"
  | "text"
  | "touch"
  | "scroll"
  | "backOrScreenOn"
  | "screenPowerMode"
  | "rotateDevice";

export type StreamServerEventType =
  | "session"
  | "video-metadata"
  | "video-reset"
  | "stream-error";

export interface StreamSessionEvent {
  type: "session";
  serial: DeviceSerial;
  viewerId: string;
  sessionId: string;
}

export interface StreamVideoMetadataEvent {
  type: "video-metadata";
  serial: DeviceSerial;
  deviceName?: string;
  width?: number;
  height?: number;
  codec: string;
}

export interface StreamVideoResetEvent {
  type: "video-reset";
  serial: DeviceSerial;
  reason: "reconnect" | "encoder-reset";
}

export interface StreamErrorEvent {
  type: "stream-error";
  serial: DeviceSerial;
  code: string;
  message: string;
  retryable: boolean;
}

export type StreamServerEvent =
  | StreamSessionEvent
  | StreamVideoMetadataEvent
  | StreamVideoResetEvent
  | StreamErrorEvent;

export interface StreamKeyControlMessage {
  type: "key";
  action: number;
  keyCode: number;
  repeat?: number;
  metaState?: number;
}

export interface StreamTextControlMessage {
  type: "text";
  text: string;
}

export interface StreamTouchControlMessage {
  type: "touch";
  action: number;
  pointerId: string;
  pointerX: number;
  pointerY: number;
  videoWidth: number;
  videoHeight: number;
  pressure: number;
  actionButton: number;
  buttons: number;
}

export interface StreamScrollControlMessage {
  type: "scroll";
  pointerX: number;
  pointerY: number;
  videoWidth: number;
  videoHeight: number;
  scrollX: number;
  scrollY: number;
  buttons: number;
}

export interface StreamBackOrScreenOnControlMessage {
  type: "backOrScreenOn";
  action: number;
}

export interface StreamScreenPowerModeControlMessage {
  type: "screenPowerMode";
  mode: number;
}

export interface StreamRotateDeviceControlMessage {
  type: "rotateDevice";
}

export type StreamClientControlMessage =
  | StreamKeyControlMessage
  | StreamTextControlMessage
  | StreamTouchControlMessage
  | StreamScrollControlMessage
  | StreamBackOrScreenOnControlMessage
  | StreamScreenPowerModeControlMessage
  | StreamRotateDeviceControlMessage;

export const STREAM_PACKET_KIND = {
  configuration: 1,
  data: 2
} as const;

export interface StreamDataPacketHeader {
  kind: "data";
  keyframe: boolean;
  pts?: bigint;
}
