import type { StreamServerEvent } from "./contracts.js";

export function createStreamSocket(serial: string): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`/ws/stream/${encodeURIComponent(serial)}`, window.location.href);
  url.protocol = protocol;

  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  return socket;
}

export function parseStreamServerEvent(raw: string): StreamServerEvent {
  return JSON.parse(raw) as StreamServerEvent;
}
