interface EmptyStateProps {
  loading: boolean;
  error: string | null;
}

export function EmptyState({ loading, error }: EmptyStateProps) {
  if (loading) {
    return (
      <section className="empty-state">
        <h2>Looking for devices…</h2>
        <p>The dashboard is waiting for ADB-visible hardware or emulators.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="empty-state">
        <h2>Device presence disconnected</h2>
        <p>{error}</p>
      </section>
    );
  }

  return (
    <section className="empty-state">
      <h2>No devices are currently visible.</h2>
      <p>Attach a device or start an emulator. The dashboard will update automatically when `/ws/devices` reports a change.</p>
    </section>
  );
}
