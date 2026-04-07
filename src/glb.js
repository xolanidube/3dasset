export function createGlb({ positions, normals, uvs, indices, colorHex, name }) {
  const normalized = normalizeAndCenter(positions);
  const positionBytes = float32Bytes(normalized);
  const normalBytes = float32Bytes(normals);
  const uvBytes = float32Bytes(uvs);
  const indexBytes = uint16Bytes(indices);
  const binBuffer = Buffer.concat([positionBytes, normalBytes, uvBytes, indexBytes]);

  const { min, max } = minMax(normalized);
  const rgb = hexToRgb(colorHex);

  const json = {
    asset: { version: "2.0", generator: "NexEras Procedural Pipeline" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [
      {
        name,
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: `${name} Material`,
        pbrMetallicRoughness: {
          baseColorFactor: [rgb[0], rgb[1], rgb[2], 1],
          metallicFactor: 0.18,
          roughnessFactor: 0.78,
        },
      },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: normalized.length / 3, type: "VEC3", min, max },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: indices.length, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positionBytes.byteLength, byteLength: normalBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positionBytes.byteLength + normalBytes.byteLength, byteLength: uvBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positionBytes.byteLength + normalBytes.byteLength + uvBytes.byteLength, byteLength: indexBytes.byteLength, target: 34963 },
    ],
    buffers: [{ byteLength: binBuffer.byteLength }],
  };

  const jsonBuffer = padJsonBuffer(Buffer.from(JSON.stringify(json), "utf8"));
  const paddedBin = padBinaryBuffer(binBuffer);
  const totalLength = 12 + 8 + jsonBuffer.byteLength + 8 + paddedBin.byteLength;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuffer.byteLength, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(paddedBin.byteLength, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, paddedBin]).toString("base64");
}

function normalizeAndCenter(positions) {
  const { min, max } = minMax(positions);
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const largest = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  const scale = 1.8 / largest;
  const normalized = positions.slice();

  for (let i = 0; i < normalized.length; i += 3) {
    normalized[i] = (normalized[i] - center[0]) * scale;
    normalized[i + 1] = (normalized[i + 1] - center[1]) * scale;
    normalized[i + 2] = (normalized[i + 2] - center[2]) * scale;
  }

  return normalized;
}

function minMax(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < values.length; i += 3) {
    min[0] = Math.min(min[0], values[i]);
    min[1] = Math.min(min[1], values[i + 1]);
    min[2] = Math.min(min[2], values[i + 2]);
    max[0] = Math.max(max[0], values[i]);
    max[1] = Math.max(max[1], values[i + 1]);
    max[2] = Math.max(max[2], values[i + 2]);
  }

  return { min, max };
}

function float32Bytes(values) {
  const padded = Buffer.alloc(padTo4(values.length * 4));
  for (let i = 0; i < values.length; i += 1) {
    padded.writeFloatLE(values[i], i * 4);
  }
  return padded;
}

function uint16Bytes(values) {
  const padded = Buffer.alloc(padTo4(values.length * 2));
  for (let i = 0; i < values.length; i += 1) {
    padded.writeUInt16LE(values[i], i * 2);
  }
  return padded;
}

function padTo4(value) {
  return Math.ceil(value / 4) * 4;
}

function padJsonBuffer(buffer) {
  const padded = Buffer.alloc(padTo4(buffer.byteLength), 0x20);
  buffer.copy(padded);
  return padded;
}

function padBinaryBuffer(buffer) {
  const padded = Buffer.alloc(padTo4(buffer.byteLength), 0);
  buffer.copy(padded);
  return padded;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}
