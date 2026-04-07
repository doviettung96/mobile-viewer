import { h264ParseConfiguration } from "@yume-chan/scrcpy";

export interface H264DecoderConfigResult {
  decoderConfig: VideoDecoderConfig;
  width: number;
  height: number;
}

function toCodecByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

export function createH264DecoderConfig(data: Uint8Array): H264DecoderConfigResult {
  const parsed = h264ParseConfiguration(data);

  return {
    decoderConfig: {
      codec: `avc1.${toCodecByte(parsed.profileIndex)}${toCodecByte(parsed.constraintSet)}${toCodecByte(parsed.levelIndex)}`,
      codedWidth: parsed.encodedWidth,
      codedHeight: parsed.encodedHeight,
      displayAspectWidth: parsed.croppedWidth,
      displayAspectHeight: parsed.croppedHeight,
      optimizeForLatency: true,
      hardwareAcceleration: "prefer-hardware"
    },
    width: parsed.croppedWidth,
    height: parsed.croppedHeight
  };
}
