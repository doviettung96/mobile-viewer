import type { DeviceSummary } from "../../lib/session/contracts.js";
import { DeviceViewerCard } from "../device-viewer/DeviceViewerCard.js";

interface DeviceTileProps {
  device: DeviceSummary;
  selected: boolean;
  onSelect(serial: string): void;
}

export function DeviceTile({ device, selected, onSelect }: DeviceTileProps) {
  return <DeviceViewerCard layout="tile" device={device} selected={selected} onSelect={onSelect} />;
}
