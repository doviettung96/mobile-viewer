import { useRef } from "react";

import { mapClientToVideoSpace } from "../../lib/input/coordinate-map.js";
import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidMotionEventAction,
  keyboardEventToControl,
  pointerEventToTouchControl,
  sendAndroidPress,
  sendBack,
  wheelEventToScrollControl
} from "../../lib/input/controls.js";
import type { DeviceSummary } from "../../lib/session/contracts.js";
import type { DeviceStreamBinding } from "../../player/useDeviceStream.js";

interface DeviceViewportProps {
  compact: boolean;
  device: DeviceSummary;
  streamEnabled: boolean;
  interactive: boolean;
  stream: DeviceStreamBinding;
  onOpenExpanded?(): void;
}

function statusLabel(stream: DeviceStreamBinding, streamEnabled: boolean): string {
  if (!streamEnabled) {
    return "Unavailable";
  }

  switch (stream.status) {
    case "connecting":
      return "Connecting";
    case "waiting":
      return "Waiting for video";
    case "streaming":
      return "Live";
    case "error":
      return "Stream error";
    default:
      return "Idle";
  }
}

export function DeviceViewport({ compact, device, streamEnabled, interactive, stream, onOpenExpanded }: DeviceViewportProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const canOpenExpanded = compact && onOpenExpanded !== undefined;

  const handlePointerEvent = (event: React.PointerEvent<HTMLDivElement>, action: number, clampOutside = false) => {
    if (!interactive || !stream.width || !stream.height) {
      return;
    }

    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const point = mapClientToVideoSpace({
      clientX: event.clientX,
      clientY: event.clientY,
      bounds,
      videoWidth: stream.width,
      videoHeight: stream.height,
      clampOutside
    });

    if (!point) {
      return;
    }

    void stream.sendControl(pointerEventToTouchControl(event.nativeEvent, point, action));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    handlePointerEvent(event, AndroidMotionEventAction.Down);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    handlePointerEvent(event, AndroidMotionEventAction.Move, true);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    handlePointerEvent(event, AndroidMotionEventAction.Up, true);
    activePointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    handlePointerEvent(event, AndroidMotionEventAction.Cancel, true);
    activePointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!interactive || !stream.width || !stream.height) {
      return;
    }

    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const point = mapClientToVideoSpace({
      clientX: event.clientX,
      clientY: event.clientY,
      bounds,
      videoWidth: stream.width,
      videoHeight: stream.height
    });

    if (!point) {
      return;
    }

    event.preventDefault();
    void stream.sendControl(wheelEventToScrollControl(event.nativeEvent, point));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) {
      if (canOpenExpanded && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onOpenExpanded();
      }
      return;
    }

    const message = keyboardEventToControl(event.nativeEvent, AndroidKeyEventAction.Down);
    if (!message) {
      return;
    }

    event.preventDefault();
    void stream.sendControl(message);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }

    const message = keyboardEventToControl(event.nativeEvent, AndroidKeyEventAction.Up);
    if (!message) {
      return;
    }

    event.preventDefault();
    void stream.sendControl(message);
  };

  const expandable = canOpenExpanded;
  const surfaceTabIndex = interactive || expandable ? 0 : -1;
  const surfaceLabel = interactive
    ? `Live viewer for ${device.displayName ?? device.model}`
    : expandable
      ? `Open expanded view for ${device.displayName ?? device.model}`
      : `Live viewer for ${device.displayName ?? device.model}`;

  return (
    <div className={`device-viewport${compact ? " is-compact" : ""}`}>
      <div className="device-viewport__toolbar">
        <span className={`viewer-status viewer-status--${stream.status}`}>{statusLabel(stream, streamEnabled)}</span>
        <div className="viewer-toolbar__actions">
          <button className="secondary-button" type="button" disabled={!interactive} onClick={() => void sendBack(stream.sendControl)}>
            Back
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!interactive}
            onClick={() => void sendAndroidPress(stream.sendControl, AndroidKeyCode.AndroidHome)}
          >
            Home
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!interactive}
            onClick={() => void stream.sendControl({ type: "rotateDevice" })}
          >
            Rotate
          </button>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`device-viewport__surface${interactive ? " is-interactive" : ""}${expandable ? " is-expandable" : ""}`}
        tabIndex={surfaceTabIndex}
        role={interactive ? "application" : expandable ? "button" : "img"}
        aria-label={surfaceLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onClick={expandable ? onOpenExpanded : undefined}
        onDoubleClick={() => onOpenExpanded?.()}
      >
        <canvas ref={stream.attachCanvas} className="device-viewport__canvas" />

        {stream.error ? (
          <div className="device-viewport__overlay device-viewport__overlay--error">
            <p>{stream.error}</p>
          </div>
        ) : !stream.hasFrame ? (
          <div className="device-viewport__overlay">
            <p>{streamEnabled ? "Waiting for the device stream." : "Live viewing is only available for connected devices."}</p>
          </div>
        ) : null}
      </div>

      <div className="device-viewport__meta">
        <span>{stream.codec ?? "codec pending"}</span>
        <span>{stream.width && stream.height ? `${stream.width} x ${stream.height}` : "resolution pending"}</span>
      </div>
    </div>
  );
}
