import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { createDeviceEventsSocket, fetchDevices, parseDeviceEnvelope } from "../lib/session/client.js";
import type { DeviceEvent, DeviceSummary } from "../lib/session/contracts.js";

interface DevicePresenceState {
  devices: DeviceSummary[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

const INITIAL_STATE: DevicePresenceState = {
  devices: [],
  loading: false,
  error: null,
  connected: false
};

function sortDevices(devices: DeviceSummary[]): DeviceSummary[] {
  return [...devices].sort((left, right) => {
    if (left.state !== right.state) {
      if (left.state === "device") {
        return -1;
      }

      if (right.state === "device") {
        return 1;
      }
    }

    return (left.displayName ?? left.model).localeCompare(right.displayName ?? right.model);
  });
}

function reduceEvent(current: DeviceSummary[], event: DeviceEvent): DeviceSummary[] {
  switch (event.type) {
    case "snapshot":
      return sortDevices(event.devices);
    case "added":
    case "updated": {
      const withoutDevice = current.filter((device) => device.serial !== event.device.serial);
      return sortDevices([...withoutDevice, event.device]);
    }
    case "removed":
      return sortDevices(current.filter((device) => device.serial !== event.serial));
  }
}

export function useDevicePresence(enabled: boolean) {
  const [state, setState] = useState<DevicePresenceState>(INITIAL_STATE);

  const handleSocketMessage = useEffectEvent((rawMessage: string) => {
    const envelope = parseDeviceEnvelope(rawMessage);
    setState((current) => ({
      ...current,
      devices: reduceEvent(current.devices, envelope.event),
      error: null
    }));
  });

  const connect = useEffectEvent(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null
    }));

    try {
      const { devices } = await fetchDevices();
      setState({
        devices: sortDevices(devices),
        loading: false,
        error: null,
        connected: false
      });
    } catch (error) {
      setState({
        devices: [],
        loading: false,
        error: error instanceof Error ? error.message : "Unable to fetch devices.",
        connected: false
      });
      return;
    }

    const socket = createDeviceEventsSocket();

    socket.addEventListener("open", () => {
      setState((current) => ({
        ...current,
        connected: true,
        error: null
      }));
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        handleSocketMessage(event.data);
      }
    });

    socket.addEventListener("close", () => {
      setState((current) => ({
        ...current,
        connected: false
      }));
    });

    socket.addEventListener("error", () => {
      setState((current) => ({
        ...current,
        error: "Device updates disconnected.",
        connected: false
      }));
    });

    return socket;
  });

  useEffect(() => {
    if (!enabled) {
      setState(INITIAL_STATE);
      return;
    }

    let cancelled = false;
    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;

    const start = async () => {
      const activeSocket = await connect();
      if (cancelled) {
        activeSocket?.close();
        return;
      }

      socket = activeSocket;
      if (!socket) {
        return;
      }

      socket.addEventListener("close", () => {
        if (cancelled) {
          return;
        }

        reconnectTimer = window.setTimeout(() => {
          void start();
        }, 2_000);
      });
    };

    void start();

    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [connect, enabled]);

  return useMemo(
    () => ({
      ...state
    }),
    [state]
  );
}
