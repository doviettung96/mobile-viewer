import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DeviceEvent } from "@mobile-viewer/shared/dist/api/index.js";
import type { DeviceSummary } from "@mobile-viewer/shared/dist/device-types/index.js";

const execFileAsync = promisify(execFile);

const DEVICE_LINE_PATTERN = /^(?<serial>\S+)\s+(?<state>device|offline|unauthorized)\b(?<details>.*)$/;
const DETAIL_PATTERN = /(\w+):([^\s]+)/g;

function decodeValue(raw: string | undefined): string | undefined {
  return raw?.replace(/_/g, " ");
}

function toSummary(line: string): DeviceSummary | null {
  const match = DEVICE_LINE_PATTERN.exec(line.trim());
  if (!match?.groups?.serial) {
    return null;
  }

  const detailText = match.groups.details ?? "";
  const detailMap = new Map<string, string>();
  for (const detail of detailText.matchAll(DETAIL_PATTERN)) {
    const key = detail[1];
    const value = detail[2];
    if (key && value) {
      detailMap.set(key, value);
    }
  }

  const serial = match.groups.serial;
  const model = decodeValue(detailMap.get("model")) ?? serial;
  const transportIdValue = detailMap.get("transport_id");
  const transportId = transportIdValue ? Number(transportIdValue) : undefined;
  const isEmulator = serial.startsWith("emulator-") || serial.includes("127.0.0.1:");

  const summary: DeviceSummary = {
    serial,
    state: match.groups.state as DeviceSummary["state"],
    model,
    displayName: model,
    isEmulator
  };

  if (typeof transportId === "number" && Number.isFinite(transportId)) {
    summary.transportId = transportId;
  }

  const product = decodeValue(detailMap.get("product"));
  if (product) {
    summary.product = product;
  }

  const deviceName = decodeValue(detailMap.get("device"));
  if (deviceName) {
    summary.deviceName = deviceName;
  }

  return summary;
}

function mapBySerial(devices: DeviceSummary[]): Map<string, DeviceSummary> {
  return new Map(devices.map((device) => [device.serial, device]));
}

function hasChanged(previous: DeviceSummary, next: DeviceSummary): boolean {
  return JSON.stringify(previous) !== JSON.stringify(next);
}

export class AdbDeviceTracker {
  #currentDevices = new Map<string, DeviceSummary>();
  #listeners = new Set<(event: DeviceEvent) => void>();
  #timer: NodeJS.Timeout | null = null;
  #refreshPromise: Promise<void> | null = null;

  constructor(
    private readonly adbPath: string,
    private readonly adbServerHost: string,
    private readonly adbServerPort: number,
    private readonly pollMs: number
  ) {}

  async listDevices(): Promise<DeviceSummary[]> {
    const devices = await readAdbDevices(this.adbPath, this.adbServerHost, this.adbServerPort);
    this.#currentDevices = mapBySerial(devices);
    return devices;
  }

  async start(): Promise<void> {
    await this.refresh();

    if (this.#timer) {
      return;
    }

    this.#timer = setInterval(() => {
      void this.refresh();
    }, this.pollMs);
    this.#timer.unref();
  }

  stop(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  subscribe(listener: (event: DeviceEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  snapshotEvent(): DeviceEvent {
    return {
      type: "snapshot",
      devices: [...this.#currentDevices.values()]
    };
  }

  private async refresh(): Promise<void> {
    if (this.#refreshPromise) {
      return this.#refreshPromise;
    }

    this.#refreshPromise = (async () => {
      try {
        const nextDevices = await readAdbDevices(this.adbPath, this.adbServerHost, this.adbServerPort);
        const nextMap = mapBySerial(nextDevices);
        const events: DeviceEvent[] = [];

        for (const [serial, device] of nextMap) {
          const previous = this.#currentDevices.get(serial);
          if (!previous) {
            events.push({ type: "added", device });
            continue;
          }

          if (hasChanged(previous, device)) {
            events.push({ type: "updated", device });
          }
        }

        for (const serial of this.#currentDevices.keys()) {
          if (!nextMap.has(serial)) {
            events.push({ type: "removed", serial });
          }
        }

        this.#currentDevices = nextMap;

        for (const event of events) {
          for (const listener of this.#listeners) {
            listener(event);
          }
        }
      } catch {
        // Ignore transient ADB failures and keep the previous snapshot.
      } finally {
        this.#refreshPromise = null;
      }
    })();

    return this.#refreshPromise;
  }
}

export async function readAdbDevices(
  adbPath: string,
  adbServerHost: string,
  adbServerPort: number
): Promise<DeviceSummary[]> {
  const { stdout } = await execFileAsync(adbPath, [
    "-H",
    adbServerHost,
    "-P",
    String(adbServerPort),
    "devices",
    "-l"
  ]);

  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => toSummary(line))
    .filter((device): device is DeviceSummary => device !== null);
}
