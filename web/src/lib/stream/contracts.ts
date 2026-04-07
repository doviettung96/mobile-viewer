import type { DeviceSerial } from "../session/contracts.js";

export type StreamServerEvent =
  | {
      type: "session";
      serial: DeviceSerial;
      viewerId: string;
      sessionId: string;
    }
  | {
      type: "video-metadata";
      serial: DeviceSerial;
      deviceName?: string;
      width?: number;
      height?: number;
      codec: string;
    }
  | {
      type: "video-reset";
      serial: DeviceSerial;
      reason: "reconnect" | "encoder-reset";
    }
  | {
      type: "stream-error";
      serial: DeviceSerial;
      code: string;
      message: string;
      retryable: boolean;
    };

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

export type StreamVideoPacket =
  | {
      kind: "configuration";
      data: Uint8Array;
    }
  | {
      kind: "data";
      data: Uint8Array;
      keyframe: boolean;
      pts?: bigint;
    };
