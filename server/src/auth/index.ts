import type { FastifyReply, FastifyRequest } from "fastify";

import type { SessionStore } from "./session-store.js";

const DEFAULT_USER_NAME = "operator";

export function isValidAuthToken(expectedToken: string, providedToken: string | undefined): boolean {
  return typeof providedToken === "string" && providedToken.length > 0 && providedToken === expectedToken;
}

export function resolveSession(request: FastifyRequest, sessionStore: SessionStore, cookieName: string) {
  return sessionStore.get(request.cookies[cookieName]);
}

export function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
  sessionStore: SessionStore,
  cookieName: string
) {
  const session = resolveSession(request, sessionStore, cookieName);
  if (!session) {
    void reply.code(401).send({
      error: "unauthorized",
      message: "Authentication is required."
    });
    return null;
  }

  return session;
}

export function normalizeUserName(userName: string | undefined): string {
  const trimmed = userName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_USER_NAME;
}
