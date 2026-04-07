import type { DeviceSummary } from "../../lib/session/contracts.js";
import { DeviceViewerCard } from "../device-viewer/DeviceViewerCard.js";

interface ExpandedDevicePaneProps {
  device: DeviceSummary;
  onBack(): void;
}

export function ExpandedDevicePane({ device, onBack }: ExpandedDevicePaneProps) {
  return <DeviceViewerCard layout="expanded" device={device} onBack={onBack} />;
}
