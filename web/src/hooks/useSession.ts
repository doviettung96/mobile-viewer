import { useEffect, useEffectEvent, useState } from "react";

import { createSession, destroySession, fetchSession } from "../lib/session/client.js";
import type { SessionInfo } from "../lib/session/contracts.js";

type SessionState =
  | {
      status: "loading";
      session: null;
      error: string | null;
      submitting: boolean;
    }
  | {
      status: "anonymous";
      session: null;
      error: string | null;
      submitting: boolean;
    }
  | {
      status: "authenticated";
      session: SessionInfo;
      error: string | null;
      submitting: boolean;
    };

const INITIAL_STATE: SessionState = {
  status: "loading",
  session: null,
  error: null,
  submitting: false
};

export function useSession() {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);

  const refreshSession = useEffectEvent(async () => {
    try {
      const session = await fetchSession();
      if (session.authenticated) {
        setState({
          status: "authenticated",
          session,
          error: null,
          submitting: false
        });
        return;
      }

      setState({
        status: "anonymous",
        session: null,
        error: null,
        submitting: false
      });
    } catch (error) {
      setState({
        status: "anonymous",
        session: null,
        error: error instanceof Error ? error.message : "Unable to load session state.",
        submitting: false
      });
    }
  });

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function login(token: string, userName: string) {
    setState((current) => ({
      ...current,
      submitting: true,
      error: null
    }));

    try {
      const trimmedUserName = userName.trim();
      const request = trimmedUserName ? { token, userName: trimmedUserName } : { token };
      const session = await createSession(request);

      setState({
        status: "authenticated",
        session,
        error: null,
        submitting: false
      });
    } catch (error) {
      setState({
        status: "anonymous",
        session: null,
        error: error instanceof Error ? error.message : "Login failed.",
        submitting: false
      });
    }
  }

  async function logout() {
    setState((current) => ({
      ...current,
      submitting: true,
      error: null
    }));

    try {
      await destroySession();
      setState({
        status: "anonymous",
        session: null,
        error: null,
        submitting: false
      });
    } catch (error) {
      setState((current) => {
        const message = error instanceof Error ? error.message : "Logout failed.";

        if (current.status === "authenticated") {
          return {
            status: "authenticated",
            session: current.session,
            error: message,
            submitting: false
          };
        }

        return {
          status: current.status,
          session: null,
          error: message,
          submitting: false
        };
      });
    }
  }

  return {
    ...state,
    login,
    logout,
    refreshSession: () => refreshSession()
  };
}
