import { useEffect, useMemo, useState } from "react";

type RouteState =
  | {
      kind: "dashboard";
      selectedSerial: null;
    }
  | {
      kind: "device";
      selectedSerial: string;
    };

function parseHash(hash: string): RouteState {
  const trimmed = hash.replace(/^#/, "");
  const deviceMatch = /^\/?device\/(?<serial>[^/]+)$/.exec(trimmed);

  if (deviceMatch?.groups?.serial) {
    return {
      kind: "device",
      selectedSerial: decodeURIComponent(deviceMatch.groups.serial)
    };
  }

  return {
    kind: "dashboard",
    selectedSerial: null
  };
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return useMemo(
    () => ({
      route,
      openDashboard() {
        window.location.hash = "/";
      },
      openDevice(serial: string) {
        window.location.hash = `/device/${encodeURIComponent(serial)}`;
      }
    }),
    [route]
  );
}
