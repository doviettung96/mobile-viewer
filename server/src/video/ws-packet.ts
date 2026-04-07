import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { STREAM_PACKET_KIND } from "@mobile-viewer/shared/dist/stream/index.js";

const DATA_FRAME_HEADER_BYTES = 10;

export function encodeMediaPacket(packet: ScrcpyMediaStreamPacket): Uint8Array {
  if (packet.type === "configuration") {
    const frame = new Uint8Array(packet.data.byteLength + 1);
    frame[0] = STREAM_PACKET_KIND.configuration;
    frame.set(packet.data, 1);
    return frame;
  }

  const frame = new Uint8Array(DATA_FRAME_HEADER_BYTES + packet.data.byteLength);
  const view = new DataView(frame.buffer);

  frame[0] = STREAM_PACKET_KIND.data;
  frame[1] = packet.keyframe ? 1 : 0;

  if (packet.pts !== undefined) {
    frame[1] |= 0b10;
    view.setBigInt64(2, packet.pts, false);
  }

  frame.set(packet.data, DATA_FRAME_HEADER_BYTES);
  return frame;
}
