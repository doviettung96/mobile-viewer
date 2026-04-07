import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

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

export interface DeviceStreamBinding extends DeviceStreamSnapshot {
  attachCanvas(node: HTMLCanvasElement | null): void;
  sendControl(message: StreamClientControlMessage): Promise<void>;
}

export function useDeviceStream(serial: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<DeviceStreamSnapshot>(INITIAL_SNAPSHOT);
  const sessionRef = useRef<BrowserStreamSession | null>(null);

  const handleSnapshot = useEffectEvent((nextSnapshot: DeviceStreamSnapshot) => {
    setSnapshot(nextSnapshot);
  });

  useEffect(() => {
    if (!enabled) {
      setSnapshot(INITIAL_SNAPSHOT);
      return;
    }

    const session = new BrowserStreamSession({
      serial,
      onSnapshot: handleSnapshot
    });

    sessionRef.current = session;
    session.start();

    return () => {
      sessionRef.current = null;
      void session.dispose();
    };
  }, [enabled, handleSnapshot, serial]);

  return useMemo(
    () => ({
      ...snapshot,
      attachCanvas(node: HTMLCanvasElement | null) {
        sessionRef.current?.attachCanvas(node);
      },
      async sendControl(message: StreamClientControlMessage) {
        await sessionRef.current?.sendControl(message);
      }
    }),
    [snapshot]
  );
}
