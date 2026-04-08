import { fileURLToPath } from "node:url";

import fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import type {
  DeviceEventEnvelope,
  DeviceListResponse,
  HealthResponse,
  SessionCreateRequest,
  SessionInfo
} from "@mobile-viewer/shared/dist/api/index.js";
import type { StreamClientControlMessage, StreamServerEvent } from "@mobile-viewer/shared/dist/stream/index.js";

import { AdbDeviceTracker } from "../adb/device-discovery.js";
import { isValidAuthToken, normalizeUserName, requireSession, resolveSession } from "../auth/index.js";
import { SessionStore } from "../auth/session-store.js";
import type { ServerConfig } from "../config/index.js";
import { StreamSessionManager } from "../stream/index.js";
import { registerStaticWebApp } from "./static.js";

type WebSocketLike = {
  readyState: number;
  on(event: string, listener: (...args: unknown[]) => void): void;
  send(data: unknown, options?: unknown): void;
  close(code?: number, data?: string): void;
};

export async function buildControlPlaneApp(config: ServerConfig): Promise<FastifyInstance> {
  const app = fastify({
    logger: false
  });
  await configureControlPlaneApp(app, config);
  return app;
}

async function configureControlPlaneApp(app: FastifyInstance, config: ServerConfig): Promise<void> {
  const sessionStore = new SessionStore(config.sessionTtlMs);
  const deviceTracker = new AdbDeviceTracker(
    config.adbPath,
    config.adbServerHost,
    config.adbServerPort,
    config.devicePollMs
  );
  const streamManager = new StreamSessionManager(config);

  await app.register(cookie);
  await app.register(websocket);

  app.addHook("onReady", async () => {
    await deviceTracker.start();
  });

  app.addHook("onClose", async () => {
    deviceTracker.stop();
    await streamManager.close();
  });

  app.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    version: config.appVersion,
    adbServerHost: config.adbServerHost,
    adbServerPort: config.adbServerPort
  }));

  app.get("/api/session", async (request: FastifyRequest): Promise<SessionInfo> => {
    const session = resolveSession(request, sessionStore, config.sessionCookieName);
    if (!session) {
      return {
        authenticated: false
      };
    }

    return {
      authenticated: true,
      userName: session.userName,
      expiresAt: new Date(session.expiresAt).toISOString()
    };
  });

  app.post(
    "/api/session",
    async (request: FastifyRequest, reply: FastifyReply): Promise<SessionInfo> => {
      const body = request.body as SessionCreateRequest | undefined;

      if (!isValidAuthToken(config.authToken, body?.token)) {
        reply.code(401);
        return {
          authenticated: false
        };
      }

      const session = sessionStore.create(normalizeUserName(body?.userName));
      reply.setCookie(config.sessionCookieName, session.id, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
        maxAge: Math.floor(config.sessionTtlMs / 1000)
      });

      return {
        authenticated: true,
        userName: session.userName,
        expiresAt: new Date(session.expiresAt).toISOString()
      };
    }
  );

  app.delete("/api/session", async (request: FastifyRequest, reply: FastifyReply): Promise<{ ok: true }> => {
    sessionStore.delete(request.cookies[config.sessionCookieName]);
    reply.clearCookie(config.sessionCookieName, {
      path: "/"
    });
    return { ok: true };
  });

  app.get("/api/devices", async (request: FastifyRequest, reply: FastifyReply): Promise<DeviceListResponse | void> => {
    const session = requireSession(request, reply, sessionStore, config.sessionCookieName);
    if (!session) {
      return;
    }

    const devices = await deviceTracker.listDevices();
    return { devices };
  });

  app.get("/ws/devices", { websocket: true }, (socket: WebSocketLike, request: FastifyRequest) => {
    const session = resolveSession(request, sessionStore, config.sessionCookieName);
    if (!session) {
      socket.send(
        JSON.stringify({
          channel: "devices",
          event: {
            type: "removed",
            serial: "unauthorized"
          }
        } satisfies DeviceEventEnvelope)
      );
      socket.close(4401, "Unauthorized");
      return;
    }

    const send = (payload: DeviceEventEnvelope) => {
      socket.send(JSON.stringify(payload));
    };

    send({
      channel: "devices",
      event: deviceTracker.snapshotEvent()
    });

    const unsubscribe = deviceTracker.subscribe((event) => {
      send({
        channel: "devices",
        event
      });
    });

    socket.on("close", () => {
      unsubscribe();
    });
  });

  app.get("/ws/stream/:serial", { websocket: true }, (socket: WebSocketLike, request: FastifyRequest) => {
    const session = resolveSession(request, sessionStore, config.sessionCookieName);
    if (!session) {
      socket.close(4401, "Unauthorized");
      return;
    }

    const rawSocket = socket as unknown as WebSocketLike;
    const params = request.params as { serial?: string };
    const serial = params.serial;

    if (!serial) {
      rawSocket.close(4400, "Missing serial");
      return;
    }

    const viewer = streamManager.addViewer(serial, {
      sendEvent(event) {
        rawSocket.send(JSON.stringify(event satisfies StreamServerEvent));
      },
      sendPacket(packet) {
        rawSocket.send(packet, { binary: true });
      },
      close(code, reason) {
        rawSocket.close(code, reason);
      }
    });

    rawSocket.on("message", (payload) => {
      const text = decodeSocketMessage(payload);
      if (!text) {
        return;
      }

      try {
        const message = JSON.parse(text) as StreamClientControlMessage;
        void streamManager.handleControl(serial, message);
      } catch {
        rawSocket.send(
          JSON.stringify({
            type: "stream-error",
            serial,
            code: "invalid_control_message",
            message: "Stream control messages must be valid JSON.",
            retryable: false
          } satisfies StreamServerEvent)
        );
      }
    });

    rawSocket.on("close", () => {
      streamManager.removeViewer(serial, viewer.id);
    });
  });

  registerStaticWebApp(app, {
    webDistDir: fileURLToPath(new URL("../../../web/dist", import.meta.url))
  });
}

function decodeSocketMessage(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload).toString("utf8");
  }

  if (Array.isArray(payload)) {
    return Buffer.concat(
      payload.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer)))
    ).toString("utf8");
  }

  if (Buffer.isBuffer(payload)) {
    return payload.toString("utf8");
  }

  return undefined;
}
