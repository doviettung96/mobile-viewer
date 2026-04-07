import { randomUUID } from "node:crypto";

export interface AuthSession {
  id: string;
  userName: string;
  expiresAt: number;
}

export class SessionStore {
  readonly #sessions = new Map<string, AuthSession>();

  constructor(private readonly ttlMs: number) {}

  create(userName: string): AuthSession {
    const session: AuthSession = {
      id: randomUUID(),
      userName,
      expiresAt: Date.now() + this.ttlMs
    };

    this.#sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string | undefined): AuthSession | null {
    if (!sessionId) {
      return null;
    }

    const session = this.#sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.#sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  delete(sessionId: string | undefined): void {
    if (!sessionId) {
      return;
    }

    this.#sessions.delete(sessionId);
  }
}
