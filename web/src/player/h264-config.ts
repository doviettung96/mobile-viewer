import { annexBSplitNalu, h264ParseConfiguration } from "@yume-chan/scrcpy";

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
  const decoderConfig: VideoDecoderConfig = {
    codec: `avc1.${toCodecByte(parsed.profileIndex)}${toCodecByte(parsed.constraintSet)}${toCodecByte(parsed.levelIndex)}`,
    description: createAvcDecoderConfigurationRecord(parsed.sequenceParameterSet, parsed.pictureParameterSet),
    codedWidth: parsed.encodedWidth,
    codedHeight: parsed.encodedHeight,
    displayAspectWidth: parsed.croppedWidth,
    displayAspectHeight: parsed.croppedHeight,
    optimizeForLatency: true,
    hardwareAcceleration: "prefer-hardware"
  };

  return {
    decoderConfig,
    width: parsed.croppedWidth,
    height: parsed.croppedHeight
  };
}

export function encodeAnnexBAvcSample(data: Uint8Array): Uint8Array {
  const nalUnits = [...annexBSplitNalu(data)];
  const size = nalUnits.reduce((total, nalUnit) => total + 4 + nalUnit.byteLength, 0);
  const sample = new Uint8Array(size);
  const view = new DataView(sample.buffer);
  let offset = 0;

  for (const nalUnit of nalUnits) {
    view.setUint32(offset, nalUnit.byteLength, false);
    offset += 4;
    sample.set(nalUnit, offset);
    offset += nalUnit.byteLength;
  }

  return sample;
}

function createAvcDecoderConfigurationRecord(sequenceParameterSet: Uint8Array, pictureParameterSet: Uint8Array): Uint8Array {
  const record = new Uint8Array(11 + sequenceParameterSet.byteLength + pictureParameterSet.byteLength);
  const view = new DataView(record.buffer);
  let offset = 0;

  record[offset++] = 1;
  record[offset++] = sequenceParameterSet[1] ?? 0;
  record[offset++] = sequenceParameterSet[2] ?? 0;
  record[offset++] = sequenceParameterSet[3] ?? 0;
  record[offset++] = 0xff;
  record[offset++] = 0xe1;
  view.setUint16(offset, sequenceParameterSet.byteLength, false);
  offset += 2;
  record.set(sequenceParameterSet, offset);
  offset += sequenceParameterSet.byteLength;
  record[offset++] = 1;
  view.setUint16(offset, pictureParameterSet.byteLength, false);
  offset += 2;
  record.set(pictureParameterSet, offset);
  return record;
}
