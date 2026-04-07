import type {
  StreamBackOrScreenOnControlMessage,
  StreamClientControlMessage,
  StreamKeyControlMessage,
  StreamScrollControlMessage,
  StreamTouchControlMessage
} from "../stream/contracts.js";
import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidMotionEventAction,
  domButtonToAndroid,
  domButtonsToAndroid,
  keyboardCodeToAndroid,
  keyboardMetaState
} from "./android.js";
import type { VideoSpacePoint } from "./coordinate-map.js";

const WHEEL_NORMALIZER = 160;

function normalizeWheelDelta(delta: number): number {
  return Math.max(-1, Math.min(1, delta / WHEEL_NORMALIZER));
}

export function keyboardEventToControl(
  event: KeyboardEvent,
  action: number
): StreamKeyControlMessage | StreamBackOrScreenOnControlMessage | null {
  if (event.code === "Escape") {
    return {
      type: "backOrScreenOn",
      action
    };
  }

  if (event.code === "KeyR" && event.altKey) {
    return null;
  }

  const keyCode = keyboardCodeToAndroid(event.code);
  if (keyCode === null) {
    return null;
  }

  return {
    type: "key",
    action,
    keyCode,
    repeat: event.repeat ? 1 : 0,
    metaState: keyboardMetaState(event)
  };
}

export function pointerEventToTouchControl(
  event: PointerEvent,
  point: VideoSpacePoint,
  action: number
): StreamTouchControlMessage {
  return {
    type: "touch",
    action,
    pointerId: String(event.pointerId),
    pointerX: point.x,
    pointerY: point.y,
    videoWidth: point.videoWidth,
    videoHeight: point.videoHeight,
    pressure: action === AndroidMotionEventAction.Up ? 0 : Math.max(event.pressure || 1, 0.1),
    actionButton: domButtonToAndroid(event.button),
    buttons: action === AndroidMotionEventAction.Up ? 0 : domButtonsToAndroid(event.buttons || (1 << event.button))
  };
}

export function wheelEventToScrollControl(
  event: WheelEvent,
  point: VideoSpacePoint
): StreamScrollControlMessage {
  return {
    type: "scroll",
    pointerX: point.x,
    pointerY: point.y,
    videoWidth: point.videoWidth,
    videoHeight: point.videoHeight,
    scrollX: normalizeWheelDelta(event.deltaX),
    scrollY: normalizeWheelDelta(event.deltaY),
    buttons: domButtonsToAndroid(event.buttons)
  };
}

export async function sendAndroidPress(
  sendControl: (message: StreamClientControlMessage) => Promise<void>,
  keyCode: number
): Promise<void> {
  await sendControl({
    type: "key",
    action: AndroidKeyEventAction.Down,
    keyCode
  });
  await sendControl({
    type: "key",
    action: AndroidKeyEventAction.Up,
    keyCode
  });
}

export async function sendBack(
  sendControl: (message: StreamClientControlMessage) => Promise<void>
): Promise<void> {
  await sendControl({
    type: "backOrScreenOn",
    action: AndroidKeyEventAction.Down
  });
  await sendControl({
    type: "backOrScreenOn",
    action: AndroidKeyEventAction.Up
  });
}

export { AndroidKeyCode, AndroidKeyEventAction, AndroidMotionEventAction };
