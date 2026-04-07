interface DashboardHeaderProps {
  userName?: string;
  expiresAt?: string;
  connected: boolean;
  onLogout(): Promise<void> | void;
}

export function DashboardHeader({ userName, expiresAt, connected, onLogout }: DashboardHeaderProps) {
  const expiryLabel = expiresAt ? new Date(expiresAt).toLocaleString() : null;

  return (
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Multi-device viewer</p>
        <h1>Device dashboard</h1>
        <p className="header-subtitle">
          Presence updates are {connected ? "live" : "reconnecting"}. Playback controls will mount into these
          shells in the next frontend bead.
        </p>
      </div>

      <div className="header-actions">
        <div className="session-pill">
          <strong>{userName ?? "operator"}</strong>
          {expiryLabel ? <span>Session expires {expiryLabel}</span> : null}
        </div>
        <button className="secondary-button" type="button" onClick={() => void onLogout()}>
          Log out
        </button>
      </div>
    </header>
  );
}
