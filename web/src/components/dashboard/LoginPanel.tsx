import { FormEvent, useState } from "react";

interface LoginPanelProps {
  loading: boolean;
  error: string | null;
  onSubmit(token: string, userName: string): Promise<void> | void;
}

export function LoginPanel({ loading, error, onSubmit }: LoginPanelProps) {
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(token, userName);
  }

  return (
    <section className="login-panel">
      <div className="login-copy">
        <p className="eyebrow">Control plane access</p>
        <h1>Open the dashboard with the shared token.</h1>
        <p>
          This v1 shell authenticates against the local backend, then subscribes to ADB-visible device presence
          over WebSocket.
        </p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          <span>User name</span>
          <input
            autoComplete="nickname"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="operator"
          />
        </label>

        <label>
          <span>Shared auth token</span>
          <input
            autoComplete="current-password"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste the backend token"
            required
          />
        </label>

        {error ? <p className="inline-error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Open dashboard"}
        </button>
      </form>
    </section>
  );
}
