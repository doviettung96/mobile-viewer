import { randomUUID } from "node:crypto";

import { AdbServerClient } from "@yume-chan/adb";
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from "@yume-chan/adb-scrcpy";
import type { ReadableStream } from "@yume-chan/stream-extra";
import {
  type AndroidKeyCode,
  type AndroidKeyEventAction,
  type AndroidKeyEventMeta,
  type AndroidMotionEventAction,
  type AndroidScreenPowerMode,
  ScrcpyVideoCodecNameMap,
  type ScrcpyControlMessageWriter,
  type ScrcpyMediaStreamPacket
} from "@yume-chan/scrcpy";
import type { ScrcpyVideoStreamMetadata } from "@yume-chan/scrcpy";
import type {
  StreamClientControlMessage,
  StreamErrorEvent,
  StreamServerEvent,
  StreamVideoMetadataEvent
} from "@mobile-viewer/shared/dist/stream/index.js";

import type { ServerConfig } from "../config/index.js";
import { pushScrcpyServer } from "../scrcpy/server-binary.js";
import { encodeMediaPacket } from "../video/ws-packet.js";

export interface StreamViewer {
  id: string;
  sendEvent(event: StreamServerEvent): void;
  sendPacket(packet: Uint8Array): void;
  close(code?: number, reason?: string): void;
}

export class DeviceStreamSession {
  readonly sessionId = randomUUID();

  #viewers = new Map<string, StreamViewer>();
  #client: AdbScrcpyClient<AdbScrcpyOptionsLatest<true>> | undefined;
  #startPromise: Promise<void> | undefined;
  #idleTimer: NodeJS.Timeout | undefined;
  #reconnectTimer: NodeJS.Timeout | undefined;
  #sizeChangedCleanup: (() => void) | undefined;
  #lastMetadata: StreamVideoMetadataEvent | undefined;
  #lastConfiguration: Uint8Array | undefined;
  #lastKeyframe: Uint8Array | undefined;
  #closed = false;

  constructor(
    readonly serial: string,
    private readonly adbServerClient: AdbServerClient,
    private readonly config: ServerConfig
  ) {}

  get viewerCount(): number {
    return this.#viewers.size;
  }

  get isClosed(): boolean {
    return this.#closed;
  }

  addViewer(viewer: StreamViewer): StreamViewer {
    this.#clearIdleTimer();
    this.#viewers.set(viewer.id, viewer);

    viewer.sendEvent({
      type: "session",
      serial: this.serial,
      viewerId: viewer.id,
      sessionId: this.sessionId
    });

    if (this.#lastMetadata) {
      viewer.sendEvent(this.#lastMetadata);
    }

    if (this.#lastConfiguration) {
      viewer.sendPacket(this.#lastConfiguration);
    }

    if (this.#lastKeyframe) {
      viewer.sendPacket(this.#lastKeyframe);
    }

    void this.#ensureStarted();
    return viewer;
  }

  removeViewer(viewerId: string): void {
    this.#viewers.delete(viewerId);
    if (this.#viewers.size === 0) {
      this.#scheduleIdleShutdown();
    }
  }

  async handleControl(message: StreamClientControlMessage): Promise<void> {
    const controller = this.#client?.controller;
    if (!controller) {
      throw new Error("Stream control is unavailable until the scrcpy session is running.");
    }

    await dispatchControlMessage(controller, message);
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#clearIdleTimer();
    this.#clearReconnectTimer();
    this.#sizeChangedCleanup?.();
    this.#sizeChangedCleanup = undefined;

    const client = this.#client;
    this.#client = undefined;
    this.#lastMetadata = undefined;
    this.#lastConfiguration = undefined;
    this.#lastKeyframe = undefined;

    if (client) {
      await client.close();
    }
  }

  async #ensureStarted(): Promise<void> {
    if (this.#closed) {
      return;
    }

    if (this.#startPromise) {
      return this.#startPromise;
    }

    this.#startPromise = this.#run();
    try {
      await this.#startPromise;
    } finally {
      this.#startPromise = undefined;
    }
  }

  async #run(): Promise<void> {
    try {
      console.log("[stream] session start", {
        serial: this.serial,
        tunnelForward: this.config.tunnelForward
      });

      if (!this.config.scrcpyServerFile) {
        throw createSessionError(
          "missing_scrcpy_server_file",
          "Set MVIEW_SCRCPY_SERVER_FILE to a readable scrcpy-server.jar before starting stream sessions.",
          false
        );
      }

      const adb = await this.adbServerClient.createAdb({ serial: this.serial });
      console.log("[stream] adb transport acquired", {
        serial: this.serial
      });

      await pushScrcpyServer(adb, this.config.scrcpyServerFile, this.config.scrcpyServerPath);
      console.log("[stream] scrcpy server pushed", {
        serial: this.serial,
        serverPath: this.config.scrcpyServerPath,
        serverFile: this.config.scrcpyServerFile
      });

      const options = new AdbScrcpyOptionsLatest({
        video: true,
        audio: false,
        control: true,
        sendCodecMeta: true,
        sendDeviceMeta: true,
        sendFrameMeta: true,
        tunnelForward: this.config.tunnelForward
      });

      const client = await AdbScrcpyClient.start(adb, this.config.scrcpyServerPath, options);
      console.log("[stream] scrcpy client started", {
        serial: this.serial,
        tunnelForward: this.config.tunnelForward
      });

      this.#client = client;
      void drainTextStream(client.output);

      const video = await client.videoStream;
      if (!video) {
        throw createSessionError("missing_video_stream", "scrcpy did not expose a video stream.", true);
      }

      console.log("[stream] video stream acquired", {
        serial: this.serial,
        codec: ScrcpyVideoCodecNameMap.get(video.metadata.codec) ?? String(video.metadata.codec),
        deviceName: video.metadata.deviceName
      });

      this.#publishMetadata(video.metadata);
      this.#sizeChangedCleanup = video.sizeChanged(({ width, height }) => {
        this.#publishMetadata({
          deviceName: video.metadata.deviceName,
          width,
          height,
          codec: video.metadata.codec
        });
      });

      await consumePacketStream(video.stream, (packet) => {
        this.#broadcastPacket(packet);
      });
    } catch (error) {
      console.error("[stream] session failed", {
        serial: this.serial,
        error
      });

      const streamError = normalizeSessionError(this.serial, error);
      this.#broadcastEvent(streamError);
      if (streamError.retryable && this.#viewers.size > 0 && !this.#closed) {
        this.#broadcastEvent({
          type: "video-reset",
          serial: this.serial,
          reason: "reconnect"
        });
        this.#scheduleReconnect();
      }
    } finally {
      this.#sizeChangedCleanup?.();
      this.#sizeChangedCleanup = undefined;

      if (this.#client) {
        await this.#client.close();
        this.#client = undefined;
      }
    }
  }

  #publishMetadata(metadata: ScrcpyVideoStreamMetadata): void {
    const event: StreamVideoMetadataEvent = {
      type: "video-metadata",
      serial: this.serial,
      codec: ScrcpyVideoCodecNameMap.get(metadata.codec) ?? String(metadata.codec)
    };

    if (metadata.deviceName !== undefined) {
      event.deviceName = metadata.deviceName;
    }

    if (metadata.width !== undefined) {
      event.width = metadata.width;
    }

    if (metadata.height !== undefined) {
      event.height = metadata.height;
    }

    this.#lastMetadata = event;
    this.#broadcastEvent(event);
  }

  #broadcastEvent(event: StreamServerEvent): void {
    for (const viewer of this.#viewers.values()) {
      viewer.sendEvent(event);
    }
  }

  #broadcastPacket(packet: ScrcpyMediaStreamPacket): void {
    const encoded = encodeMediaPacket(packet);

    if (packet.type === "configuration") {
      this.#lastConfiguration = encoded;
      this.#lastKeyframe = undefined;
    } else if (packet.keyframe) {
      this.#lastKeyframe = encoded;
    }

    for (const viewer of this.#viewers.values()) {
      viewer.sendPacket(encoded);
    }
  }

  #scheduleReconnect(): void {
    this.#clearReconnectTimer();
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined;
      void this.#ensureStarted();
    }, this.config.streamReconnectDelayMs);
    this.#reconnectTimer.unref();
  }

  #scheduleIdleShutdown(): void {
    this.#clearIdleTimer();
    this.#idleTimer = setTimeout(() => {
      this.#idleTimer = undefined;
      void this.close();
    }, this.config.streamIdleTimeoutMs);
    this.#idleTimer.unref();
  }

  #clearIdleTimer(): void {
    if (this.#idleTimer) {
      clearTimeout(this.#idleTimer);
      this.#idleTimer = undefined;
    }
  }

  #clearReconnectTimer(): void {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = undefined;
    }
  }
}

function createSessionError(code: string, message: string, retryable: boolean): StreamErrorEvent {
  return {
    type: "stream-error",
    serial: "",
    code,
    message,
    retryable
  };
}

function normalizeSessionError(serial: string, error: unknown): StreamErrorEvent {
  if (isStreamErrorEvent(error)) {
    return {
      ...error,
      serial
    };
  }

  if (error instanceof Error) {
    return {
      type: "stream-error",
      serial,
      code: "scrcpy_session_error",
      message: error.message,
      retryable: true
    };
  }

  return {
    type: "stream-error",
    serial,
    code: "unknown_stream_error",
    message: "The scrcpy session failed unexpectedly.",
    retryable: true
  };
}

function isStreamErrorEvent(value: unknown): value is StreamErrorEvent {
  return typeof value === "object" && value !== null && (value as StreamErrorEvent).type === "stream-error";
}

async function consumePacketStream(
  stream: ReadableStream<ScrcpyMediaStreamPacket>,
  onPacket: (packet: ScrcpyMediaStreamPacket) => void
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      onPacket(value);
    }
  } finally {
    reader.releaseLock();
  }
}

async function drainTextStream(stream: ReadableStream<string>): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      if (value !== "") {
        console.log("[stream] scrcpy output", value);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function dispatchControlMessage(
  controller: ScrcpyControlMessageWriter,
  message: StreamClientControlMessage
): Promise<void> {
  switch (message.type) {
    case "key":
      await controller.injectKeyCode({
        action: message.action as AndroidKeyEventAction,
        keyCode: message.keyCode as AndroidKeyCode,
        repeat: message.repeat ?? 0,
        metaState: (message.metaState ?? 0) as AndroidKeyEventMeta
      });
      return;
    case "text":
      await controller.injectText(message.text);
      return;
    case "touch":
      await controller.injectTouch({
        action: message.action as AndroidMotionEventAction,
        pointerId: BigInt(message.pointerId),
        pointerX: message.pointerX,
        pointerY: message.pointerY,
        videoWidth: message.videoWidth,
        videoHeight: message.videoHeight,
        pressure: message.pressure,
        actionButton: message.actionButton,
        buttons: message.buttons
      });
      return;
    case "scroll":
      await controller.injectScroll({
        pointerX: message.pointerX,
        pointerY: message.pointerY,
        videoWidth: message.videoWidth,
        videoHeight: message.videoHeight,
        scrollX: message.scrollX,
        scrollY: message.scrollY,
        buttons: message.buttons
      });
      return;
    case "backOrScreenOn":
      await controller.backOrScreenOn(message.action as AndroidKeyEventAction);
      return;
    case "screenPowerMode":
      await controller.setScreenPowerMode(message.mode as AndroidScreenPowerMode);
      return;
    case "rotateDevice":
      await controller.rotateDevice();
      return;
  }
}
