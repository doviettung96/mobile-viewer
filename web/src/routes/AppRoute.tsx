import { useMemo } from "react";

import { CapabilityNotice } from "../components/dashboard/CapabilityNotice.js";
import { DashboardHeader } from "../components/dashboard/DashboardHeader.js";
import { DeviceTile } from "../components/dashboard/DeviceTile.js";
import { EmptyState } from "../components/dashboard/EmptyState.js";
import { ExpandedDevicePane } from "../components/dashboard/ExpandedDevicePane.js";
import { LoginPanel } from "../components/dashboard/LoginPanel.js";
import { useDevicePresence } from "../hooks/useDevicePresence.js";
import { useSession } from "../hooks/useSession.js";
import { useHashRoute } from "./useHashRoute.js";

function detectCapabilities() {
  return {
    isSecureContext: window.isSecureContext,
    supportsWebCodecs: typeof VideoDecoder !== "undefined"
  };
}

export function AppRoute() {
  const capabilities = useMemo(() => detectCapabilities(), []);
  const route = useHashRoute();
  const session = useSession();
  const devicePresence = useDevicePresence(session.status === "authenticated");

  if (session.status !== "authenticated") {
    return (
      <main className="dashboard-shell">
        <CapabilityNotice
          isSecureContext={capabilities.isSecureContext}
          supportsWebCodecs={capabilities.supportsWebCodecs}
        />
        <LoginPanel
          loading={session.submitting}
          error={session.error}
          onSubmit={(token, userName) => session.login(token, userName)}
        />
      </main>
    );
  }

  const selectedDevice =
    route.route.kind === "device"
      ? devicePresence.devices.find((device) => device.serial === route.route.selectedSerial) ?? null
      : null;
  const headerProps = {
    connected: devicePresence.connected,
    onLogout: session.logout,
    ...(session.session.userName ? { userName: session.session.userName } : {}),
    ...(session.session.expiresAt ? { expiresAt: session.session.expiresAt } : {})
  };

  return (
    <main className="dashboard-shell">
      <CapabilityNotice
        isSecureContext={capabilities.isSecureContext}
        supportsWebCodecs={capabilities.supportsWebCodecs}
      />

      <DashboardHeader {...headerProps} />

      {devicePresence.devices.length === 0 ? (
        <EmptyState loading={devicePresence.loading} error={devicePresence.error} />
      ) : (
        <section className={`dashboard-layout${selectedDevice ? " has-expanded-pane" : ""}`}>
          <div className="device-grid" aria-label="Connected devices">
            {devicePresence.devices.map((device) => (
              <DeviceTile
                key={device.serial}
                device={device}
                selected={device.serial === selectedDevice?.serial}
                onSelect={route.openDevice}
              />
            ))}
          </div>

          {selectedDevice ? <ExpandedDevicePane device={selectedDevice} onBack={route.openDashboard} /> : null}
        </section>
      )}
    </main>
  );
}
