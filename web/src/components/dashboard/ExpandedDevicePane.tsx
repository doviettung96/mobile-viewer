import type { DeviceSummary } from "../../lib/session/contracts.js";

interface ExpandedDevicePaneProps {
  device: DeviceSummary;
  onBack(): void;
}

export function ExpandedDevicePane({ device, onBack }: ExpandedDevicePaneProps) {
  return (
    <aside className="expanded-pane" aria-label={`Expanded view for ${device.displayName ?? device.model}`}>
      <div className="expanded-pane__header">
        <div>
          <p className="eyebrow">Expanded device shell</p>
          <h2>{device.displayName ?? device.model}</h2>
          <p>{device.serial}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to grid
        </button>
      </div>

      <div className="expanded-stage">
        <div className="stage-placeholder">
          <p>Player mount point</p>
          <strong>Live video and controls land here in `mview-z8z`.</strong>
        </div>

        <dl className="expanded-meta">
          <div>
            <dt>Status</dt>
            <dd>{device.state}</dd>
          </div>
          <div>
            <dt>Product</dt>
            <dd>{device.product ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Device name</dt>
            <dd>{device.deviceName ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Transport</dt>
            <dd>{device.transportId ?? "n/a"}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
