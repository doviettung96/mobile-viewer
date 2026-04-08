import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import type { StreamClientControlMessage } from "../lib/stream/contracts.js";
import { BrowserStreamSession, type DeviceStreamSnapshot } from "./stream-session.js";

const INITIAL_SNAPSHOT: DeviceStreamSnapshot = {
  status: "idle",
  connected: false,
  hasFrame: false,
  error: null,
  codec: null,
  deviceName: null,
  sessionId: null,
  viewerId: null,
  width: null,
  height: null,
  resetReason: null
};

function getPlaybackCapabilityError(): string | null {
  if (typeof VideoDecoder !== "undefined") {
    return null;
  }

  if (!window.isSecureContext) {
    return "Live playback is unavailable on this page because WebCodecs requires HTTPS or localhost.";
  }

  return "Live playback is unavailable because this browser does not expose WebCodecs or VideoDecoder on this page.";
}

export interface DeviceStreamBinding extends DeviceStreamSnapshot {
  attachCanvas(node: HTMLCanvasElement | null): void;
  sendControl(message: StreamClientControlMessage): Promise<void>;
}

export function useDeviceStream(serial: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<DeviceStreamSnapshot>(INITIAL_SNAPSHOT);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionRef = useRef<BrowserStreamSession | null>(null);

  const handleSnapshot = useEffectEvent((nextSnapshot: DeviceStreamSnapshot) => {
    setSnapshot(nextSnapshot);
  });

  useEffect(() => {
    if (!enabled) {
      setSnapshot(INITIAL_SNAPSHOT);
      return;
    }

    const capabilityError = getPlaybackCapabilityError();
    if (capabilityError) {
      setSnapshot({
        ...INITIAL_SNAPSHOT,
        status: "error",
        error: capabilityError
      });
      return;
    }

    const session = new BrowserStreamSession({
      serial,
      onSnapshot: handleSnapshot
    });

    sessionRef.current = session;
    session.attachCanvas(canvasRef.current);
    session.start();

    return () => {
      sessionRef.current = null;
      void session.dispose();
    };
  }, [enabled, serial]);

  const attachCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    sessionRef.current?.attachCanvas(node);
  }, []);

  const sendControl = useCallback(async (message: StreamClientControlMessage) => {
    await sessionRef.current?.sendControl(message);
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      attachCanvas,
      sendControl
    }),
    [attachCanvas, sendControl, snapshot]
  );
}
