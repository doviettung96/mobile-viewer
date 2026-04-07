import { randomUUID } from "node:crypto";

import { AdbServerClient } from "@yume-chan/adb";
import { AdbServerNodeTcpConnector } from "@yume-chan/adb-server-node-tcp";
import type { StreamClientControlMessage } from "@mobile-viewer/shared/dist/stream/index.js";

import type { ServerConfig } from "../config/index.js";
import { DeviceStreamSession, type StreamViewer } from "./session.js";

export class StreamSessionManager {
  #adbServerClient: AdbServerClient;
  #sessions = new Map<string, DeviceStreamSession>();

  constructor(private readonly config: ServerConfig) {
    this.#adbServerClient = new AdbServerClient(
      new AdbServerNodeTcpConnector({
        host: config.adbServerHost,
        port: config.adbServerPort
      })
    );
  }

  addViewer(
    serial: string,
    viewer: Omit<StreamViewer, "id">
  ): StreamViewer {
    const session = this.#getOrCreateSession(serial);
    return session.addViewer({
      id: randomUUID(),
      ...viewer
    });
  }

  removeViewer(serial: string, viewerId: string): void {
    const session = this.#sessions.get(serial);
    if (!session) {
      return;
    }

    session.removeViewer(viewerId);
  }

  async handleControl(serial: string, message: StreamClientControlMessage): Promise<void> {
    const session = this.#sessions.get(serial);
    if (!session) {
      throw new Error(`No active stream session exists for device ${serial}.`);
    }

    await session.handleControl(message);
  }

  async close(): Promise<void> {
    const sessions = [...this.#sessions.values()];
    this.#sessions.clear();
    await Promise.all(sessions.map((session) => session.close()));
  }

  #getOrCreateSession(serial: string): DeviceStreamSession {
    let session = this.#sessions.get(serial);
    if (!session || session.isClosed) {
      session = new DeviceStreamSession(serial, this.#adbServerClient, this.config);
      this.#sessions.set(serial, session);
    }

    return session;
  }
}
