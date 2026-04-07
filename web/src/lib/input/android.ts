import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidKeyEventMeta,
  AndroidMotionEventAction,
  AndroidMotionEventButton
} from "@yume-chan/scrcpy";

const KEY_CODE_BY_DOM_CODE: Partial<Record<string, number>> = {
  Digit0: AndroidKeyCode.Digit0,
  Digit1: AndroidKeyCode.Digit1,
  Digit2: AndroidKeyCode.Digit2,
  Digit3: AndroidKeyCode.Digit3,
  Digit4: AndroidKeyCode.Digit4,
  Digit5: AndroidKeyCode.Digit5,
  Digit6: AndroidKeyCode.Digit6,
  Digit7: AndroidKeyCode.Digit7,
  Digit8: AndroidKeyCode.Digit8,
  Digit9: AndroidKeyCode.Digit9,
  KeyA: AndroidKeyCode.KeyA,
  KeyB: AndroidKeyCode.KeyB,
  KeyC: AndroidKeyCode.KeyC,
  KeyD: AndroidKeyCode.KeyD,
  KeyE: AndroidKeyCode.KeyE,
  KeyF: AndroidKeyCode.KeyF,
  KeyG: AndroidKeyCode.KeyG,
  KeyH: AndroidKeyCode.KeyH,
  KeyI: AndroidKeyCode.KeyI,
  KeyJ: AndroidKeyCode.KeyJ,
  KeyK: AndroidKeyCode.KeyK,
  KeyL: AndroidKeyCode.KeyL,
  KeyM: AndroidKeyCode.KeyM,
  KeyN: AndroidKeyCode.KeyN,
  KeyO: AndroidKeyCode.KeyO,
  KeyP: AndroidKeyCode.KeyP,
  KeyQ: AndroidKeyCode.KeyQ,
  KeyR: AndroidKeyCode.KeyR,
  KeyS: AndroidKeyCode.KeyS,
  KeyT: AndroidKeyCode.KeyT,
  KeyU: AndroidKeyCode.KeyU,
  KeyV: AndroidKeyCode.KeyV,
  KeyW: AndroidKeyCode.KeyW,
  KeyX: AndroidKeyCode.KeyX,
  KeyY: AndroidKeyCode.KeyY,
  KeyZ: AndroidKeyCode.KeyZ,
  Enter: AndroidKeyCode.Enter,
  NumpadEnter: AndroidKeyCode.NumpadEnter,
  Escape: AndroidKeyCode.Escape,
  Space: AndroidKeyCode.Space,
  Tab: AndroidKeyCode.Tab,
  Backspace: AndroidKeyCode.Backspace,
  Delete: AndroidKeyCode.Delete,
  Insert: AndroidKeyCode.Insert,
  Home: AndroidKeyCode.Home,
  End: AndroidKeyCode.End,
  PageUp: AndroidKeyCode.PageUp,
  PageDown: AndroidKeyCode.PageDown,
  ArrowUp: AndroidKeyCode.ArrowUp,
  ArrowDown: AndroidKeyCode.ArrowDown,
  ArrowLeft: AndroidKeyCode.ArrowLeft,
  ArrowRight: AndroidKeyCode.ArrowRight,
  Minus: AndroidKeyCode.Minus,
  Equal: AndroidKeyCode.Equal,
  BracketLeft: AndroidKeyCode.BracketLeft,
  BracketRight: AndroidKeyCode.BracketRight,
  Backslash: AndroidKeyCode.Backslash,
  Semicolon: AndroidKeyCode.Semicolon,
  Quote: AndroidKeyCode.Quote,
  Backquote: AndroidKeyCode.Backquote,
  Comma: AndroidKeyCode.Comma,
  Period: AndroidKeyCode.Period,
  Slash: AndroidKeyCode.Slash
};

export {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidKeyEventMeta,
  AndroidMotionEventAction,
  AndroidMotionEventButton
};

export function keyboardCodeToAndroid(code: string): number | null {
  return KEY_CODE_BY_DOM_CODE[code] ?? null;
}

export function keyboardMetaState(event: KeyboardEvent): number {
  let metaState = AndroidKeyEventMeta.None;

  if (event.shiftKey) {
    metaState |= AndroidKeyEventMeta.Shift;
  }

  if (event.altKey) {
    metaState |= AndroidKeyEventMeta.Alt;
  }

  if (event.ctrlKey) {
    metaState |= AndroidKeyEventMeta.Ctrl;
  }

  if (event.metaKey) {
    metaState |= AndroidKeyEventMeta.Meta;
  }

  return metaState;
}

export function domButtonsToAndroid(buttons: number): number {
  let androidButtons = AndroidMotionEventButton.None;

  if (buttons & 1) {
    androidButtons |= AndroidMotionEventButton.Primary;
  }

  if (buttons & 2) {
    androidButtons |= AndroidMotionEventButton.Secondary;
  }

  if (buttons & 4) {
    androidButtons |= AndroidMotionEventButton.Tertiary;
  }

  if (buttons & 8) {
    androidButtons |= AndroidMotionEventButton.Back;
  }

  if (buttons & 16) {
    androidButtons |= AndroidMotionEventButton.Forward;
  }

  return androidButtons;
}

export function domButtonToAndroid(button: number): number {
  switch (button) {
    case 0:
      return AndroidMotionEventButton.Primary;
    case 1:
      return AndroidMotionEventButton.Tertiary;
    case 2:
      return AndroidMotionEventButton.Secondary;
    case 3:
      return AndroidMotionEventButton.Back;
    case 4:
      return AndroidMotionEventButton.Forward;
    default:
      return AndroidMotionEventButton.None;
  }
}
