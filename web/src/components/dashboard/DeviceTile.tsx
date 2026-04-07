import type { DeviceSummary } from "../../lib/session/contracts.js";

interface DeviceTileProps {
  device: DeviceSummary;
  selected: boolean;
  onSelect(serial: string): void;
}

export function DeviceTile({ device, selected, onSelect }: DeviceTileProps) {
  return (
    <button
      type="button"
      className={`device-tile${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(device.serial)}
    >
      <div className="device-tile__header">
        <div>
          <h2>{device.displayName ?? device.model}</h2>
          <p>{device.serial}</p>
        </div>
        <span className={`device-state state-${device.state}`}>{device.state}</span>
      </div>

      <dl className="device-meta">
        <div>
          <dt>Model</dt>
          <dd>{device.model}</dd>
        </div>
        <div>
          <dt>Kind</dt>
          <dd>{device.isEmulator ? "Emulator" : "Hardware"}</dd>
        </div>
        {device.product ? (
          <div>
            <dt>Product</dt>
            <dd>{device.product}</dd>
          </div>
        ) : null}
      </dl>
    </button>
  );
}
