import { createStreamSocket, parseStreamServerEvent } from "../lib/stream/client.js";
import type { StreamClientControlMessage, StreamServerEvent, StreamVideoPacket } from "../lib/stream/contracts.js";
import { parseStreamVideoPacket } from "../lib/stream/packet.js";
import { createH264DecoderConfig, encodeAnnexBAvcSample } from "./h264-config.js";

export interface DeviceStreamSnapshot {
  status: "idle" | "connecting" | "waiting" | "streaming" | "error";
  connected: boolean;
  hasFrame: boolean;
  error: string | null;
  codec: string | null;
  deviceName: string | null;
  sessionId: string | null;
  viewerId: string | null;
  width: number | null;
  height: number | null;
  resetReason: "reconnect" | "encoder-reset" | null;
}

interface BrowserStreamSessionOptions {
  serial: string;
  onSnapshot(snapshot: DeviceStreamSnapshot): void;
}

const INITIAL_SNAPSHOT: DeviceStreamSnapshot = {
  status: "idle",
  connected: false,
  hasFrame: false,
  error: null,
  codec: null,
  deviceName: null,
  sessionId: null,
  viewerId: null,
  width: null,
  height: null,
  resetReason: null
};

export class BrowserStreamSession {
  #socket: WebSocket | null = null;
  #decoder: VideoDecoder | null = null;
  #snapshot: DeviceStreamSnapshot = INITIAL_SNAPSHOT;
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #nextTimestamp = 0;
  #disposed = false;

  constructor(private readonly options: BrowserStreamSessionOptions) {}

  start(): void {
    if (this.#disposed) {
      return;
    }

    this.#setSnapshot({
      ...this.#snapshot,
      status: "connecting",
      connected: false,
      error: null,
      hasFrame: false,
      resetReason: null
    });

    const socket = createStreamSocket(this.options.serial);
    this.#socket = socket;

    socket.addEventListener("open", () => {
      this.#setSnapshot({
        ...this.#snapshot,
        status: this.#snapshot.hasFrame ? "streaming" : "waiting",
        connected: true,
        error: null
      });
    });

    socket.addEventListener("message", (event) => {
      void this.#handleMessage(event.data);
    });

    socket.addEventListener("close", () => {
      this.#setSnapshot({
        ...this.#snapshot,
        connected: false,
        status: this.#snapshot.hasFrame ? "error" : "idle"
      });
      this.#teardownDecoder();
    });

    socket.addEventListener("error", () => {
      this.#setSnapshot({
        ...this.#snapshot,
        connected: false,
        status: "error",
        error: "The stream WebSocket disconnected."
      });
    });
  }

  attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.#canvas = canvas;
    this.#context = canvas?.getContext("2d") ?? null;
    if (canvas && this.#snapshot.width && this.#snapshot.height) {
      canvas.width = this.#snapshot.width;
      canvas.height = this.#snapshot.height;
    }
  }

  async sendControl(message: StreamClientControlMessage): Promise<void> {
    if (!this.#socket || this.#socket.readyState !== WebSocket.OPEN) {
      throw new Error("The device stream is not connected.");
    }

    this.#socket.send(JSON.stringify(message));
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#socket?.close();
    this.#socket = null;
    await this.#decoder?.flush().catch(() => undefined);
    this.#teardownDecoder();
  }

  async #handleMessage(payload: unknown): Promise<void> {
    if (typeof payload === "string") {
      this.#handleServerEvent(parseStreamServerEvent(payload));
      return;
    }

    if (!(payload instanceof ArrayBuffer)) {
      return;
    }

    this.#handleVideoPacket(parseStreamVideoPacket(payload));
  }

  #handleServerEvent(event: StreamServerEvent): void {
    switch (event.type) {
      case "session":
        this.#setSnapshot({
          ...this.#snapshot,
          connected: true,
          status: this.#snapshot.hasFrame ? "streaming" : "waiting",
          sessionId: event.sessionId,
          viewerId: event.viewerId
        });
        return;
      case "video-metadata":
        this.#setSnapshot({
          ...this.#snapshot,
          codec: event.codec,
          deviceName: event.deviceName ?? this.#snapshot.deviceName,
          width: event.width ?? this.#snapshot.width,
          height: event.height ?? this.#snapshot.height
        });
        this.#syncCanvasSize();
        return;
      case "video-reset":
        this.#nextTimestamp = 0;
        this.#teardownDecoder();
        this.#clearCanvas();
        this.#setSnapshot({
          ...this.#snapshot,
          status: "waiting",
          hasFrame: false,
          error: null,
          resetReason: event.reason
        });
        return;
      case "stream-error":
        this.#setSnapshot({
          ...this.#snapshot,
          status: "error",
          error: event.message
        });
        return;
    }
  }

  #handleVideoPacket(packet: StreamVideoPacket): void {
    if (packet.kind === "configuration") {
      this.#configureDecoder(packet.data);
      return;
    }

    if (!this.#decoder || this.#snapshot.status === "error") {
      return;
    }

    try {
      const timestamp = packet.pts !== undefined ? Number(packet.pts) : this.#nextTimestamp++;
      const data = encodeAnnexBAvcSample(packet.data);

      this.#decoder.decode(
        new EncodedVideoChunk({
          type: packet.keyframe ? "key" : "delta",
          timestamp,
          data
        })
      );
    } catch (error) {
      this.#setSnapshot({
        ...this.#snapshot,
        status: "error",
        error: error instanceof Error ? error.message : "Unable to decode the device stream."
      });
    }
  }

  #configureDecoder(data: Uint8Array): void {
    try {
      const { decoderConfig, width, height } = createH264DecoderConfig(data);

      if (!this.#decoder) {
        this.#decoder = new VideoDecoder({
          output: (frame) => {
            this.#renderFrame(frame);
          },
          error: (error) => {
            this.#setSnapshot({
              ...this.#snapshot,
              status: "error",
              error: error.message
            });
          }
        });
      }

      this.#decoder.configure(decoderConfig);
      this.#setSnapshot({
        ...this.#snapshot,
        status: "waiting",
        error: null,
        codec: decoderConfig.codec,
        width,
        height
      });
      this.#syncCanvasSize();
    } catch (error) {
      this.#setSnapshot({
        ...this.#snapshot,
        status: "error",
        error: error instanceof Error ? error.message : "Unable to configure the browser decoder."
      });
    }
  }

  #renderFrame(frame: VideoFrame): void {
    try {
      const width = frame.displayWidth || frame.codedWidth;
      const height = frame.displayHeight || frame.codedHeight;

      if (this.#canvas && this.#context) {
        if (this.#canvas.width !== width || this.#canvas.height !== height) {
          this.#canvas.width = width;
          this.#canvas.height = height;
        }

        this.#context.drawImage(frame, 0, 0, width, height);
      }

      this.#setSnapshot({
        ...this.#snapshot,
        status: "streaming",
        hasFrame: true,
        error: null,
        width,
        height
      });
    } finally {
      frame.close();
    }
  }

  #setSnapshot(snapshot: DeviceStreamSnapshot): void {
    this.#snapshot = snapshot;
    this.options.onSnapshot(snapshot);
  }

  #syncCanvasSize(): void {
    if (!this.#canvas || !this.#snapshot.width || !this.#snapshot.height) {
      return;
    }

    this.#canvas.width = this.#snapshot.width;
    this.#canvas.height = this.#snapshot.height;
  }

  #clearCanvas(): void {
    if (!this.#canvas || !this.#context) {
      return;
    }

    this.#context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  #teardownDecoder(): void {
    if (!this.#decoder) {
      return;
    }

    this.#decoder.close();
    this.#decoder = null;
  }
}
