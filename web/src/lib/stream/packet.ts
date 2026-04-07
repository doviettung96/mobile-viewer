import type { StreamVideoPacket } from "./contracts.js";

const STREAM_PACKET_KIND = {
  configuration: 1,
  data: 2
} as const;

const DATA_FRAME_HEADER_BYTES = 10;
const HAS_PTS_MASK = 0b10;
const KEYFRAME_MASK = 0b01;

export function parseStreamVideoPacket(payload: ArrayBuffer): StreamVideoPacket {
  const frame = new Uint8Array(payload);
  if (frame.byteLength === 0) {
    throw new Error("Received an empty stream packet.");
  }

  if (frame[0] === STREAM_PACKET_KIND.configuration) {
    return {
      kind: "configuration",
      data: frame.slice(1)
    };
  }

  if (frame[0] !== STREAM_PACKET_KIND.data) {
    throw new Error(`Unknown stream packet kind: ${frame[0]}`);
  }

  if (frame.byteLength < DATA_FRAME_HEADER_BYTES) {
    throw new Error("Incomplete stream data packet header.");
  }

  const flags = frame[1] ?? 0;
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const hasPts = (flags & HAS_PTS_MASK) !== 0;

  const packet = {
    kind: "data",
    keyframe: (flags & KEYFRAME_MASK) !== 0,
    data: frame.slice(DATA_FRAME_HEADER_BYTES)
  } satisfies Omit<Extract<StreamVideoPacket, { kind: "data" }>, "pts">;

  return hasPts
    ? {
        ...packet,
        pts: view.getBigInt64(2, false)
      }
    : packet;
}
