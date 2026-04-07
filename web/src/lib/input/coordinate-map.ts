export interface VideoSpacePoint {
  x: number;
  y: number;
  videoWidth: number;
  videoHeight: number;
  inside: boolean;
}

interface CoordinateMapOptions {
  clientX: number;
  clientY: number;
  bounds: DOMRect;
  videoWidth: number;
  videoHeight: number;
  clampOutside?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mapClientToVideoSpace({
  clientX,
  clientY,
  bounds,
  videoWidth,
  videoHeight,
  clampOutside = false
}: CoordinateMapOptions): VideoSpacePoint | null {
  if (videoWidth <= 0 || videoHeight <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const scale = Math.min(bounds.width / videoWidth, bounds.height / videoHeight);
  const displayWidth = videoWidth * scale;
  const displayHeight = videoHeight * scale;
  const offsetX = (bounds.width - displayWidth) / 2;
  const offsetY = (bounds.height - displayHeight) / 2;

  const localX = clientX - bounds.left - offsetX;
  const localY = clientY - bounds.top - offsetY;
  const inside = localX >= 0 && localX <= displayWidth && localY >= 0 && localY <= displayHeight;

  if (!inside && !clampOutside) {
    return null;
  }

  const clampedX = clamp(localX, 0, displayWidth);
  const clampedY = clamp(localY, 0, displayHeight);

  return {
    x: Math.round(clampedX / scale),
    y: Math.round(clampedY / scale),
    videoWidth,
    videoHeight,
    inside
  };
}
