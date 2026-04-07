import type { DeviceSummary } from "../../lib/session/contracts.js";
import { useDeviceStream } from "../../player/useDeviceStream.js";
import { DeviceViewport } from "./DeviceViewport.js";

type DeviceViewerCardProps =
  | {
      layout: "tile";
      device: DeviceSummary;
      selected: boolean;
      onSelect(serial: string): void;
    }
  | {
      layout: "expanded";
      device: DeviceSummary;
      onBack(): void;
    };

export function DeviceViewerCard(props: DeviceViewerCardProps) {
  const interactive = props.device.state === "device";
  const stream = useDeviceStream(props.device.serial, interactive);
  const deviceName = props.device.displayName ?? props.device.model;

  if (props.layout === "tile") {
    return (
      <article className={`device-tile${props.selected ? " is-selected" : ""}`}>
        <div className="device-tile__header">
          <div>
            <h2>{deviceName}</h2>
            <p>{props.device.serial}</p>
          </div>
          <span className={`device-state state-${props.device.state}`}>{props.device.state}</span>
        </div>

        <DeviceViewport compact={true} device={props.device} interactive={interactive} stream={stream} />

        <dl className="device-meta">
          <div>
            <dt>Model</dt>
            <dd>{props.device.model}</dd>
          </div>
          <div>
            <dt>Kind</dt>
            <dd>{props.device.isEmulator ? "Emulator" : "Hardware"}</dd>
          </div>
          <div>
            <dt>Viewer</dt>
            <dd>{stream.viewerId ?? "pending"}</dd>
          </div>
        </dl>

        <button className="secondary-button device-tile__expand" type="button" onClick={() => props.onSelect(props.device.serial)}>
          {props.selected ? "Expanded view open" : "Open expanded view"}
        </button>
      </article>
    );
  }

  return (
    <aside className="expanded-pane" aria-label={`Expanded view for ${deviceName}`}>
      <div className="expanded-pane__header">
        <div>
          <p className="eyebrow">Expanded device shell</p>
          <h2>{deviceName}</h2>
          <p>{props.device.serial}</p>
        </div>
        <button className="secondary-button" type="button" onClick={props.onBack}>
          Back to grid
        </button>
      </div>

      <div className="expanded-stage">
        <DeviceViewport compact={false} device={props.device} interactive={interactive} stream={stream} />

        <dl className="expanded-meta">
          <div>
            <dt>Status</dt>
            <dd>{props.device.state}</dd>
          </div>
          <div>
            <dt>Product</dt>
            <dd>{props.device.product ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Device name</dt>
            <dd>{stream.deviceName ?? props.device.deviceName ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Transport</dt>
            <dd>{props.device.transportId ?? "n/a"}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
