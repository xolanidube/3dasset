export const MODEL_LIBRARY = {
  "hard hat": {
    objectType: "hard hat",
    color: "#f2c230",
    summarySeed: "Personal protective equipment worn on construction and industrial sites to reduce head injury risk.",
    build: createHardHat,
  },
  helmet: {
    objectType: "hard hat",
    color: "#f2c230",
    summarySeed: "Safety helmet used to protect the head from impact and falling debris.",
    build: createHardHat,
  },
  hammer: {
    objectType: "hammer",
    color: "#7b4f2b",
    summarySeed: "Hand tool used to drive nails, fit parts, and perform light demolition work.",
    build: createHammer,
  },
  wrench: {
    objectType: "wrench",
    color: "#9aa4ad",
    summarySeed: "Hand tool used to grip and turn nuts, bolts, and fittings.",
    build: createWrench,
  },
  spanner: {
    objectType: "wrench",
    color: "#9aa4ad",
    summarySeed: "Hand tool used to apply torque to fasteners.",
    build: createWrench,
  },
  screwdriver: {
    objectType: "screwdriver",
    color: "#d2462f",
    summarySeed: "Hand tool used to tighten or loosen screws in equipment and fittings.",
    build: createScrewdriver,
  },
  cone: {
    objectType: "traffic cone",
    color: "#ff6b2d",
    summarySeed: "Portable marker used to warn people and redirect movement around hazards.",
    build: createTrafficCone,
  },
  barrel: {
    objectType: "barrel",
    color: "#2f6db3",
    summarySeed: "Large cylindrical container used to store or transport materials.",
    build: createBarrel,
  },
  box: {
    objectType: "crate",
    color: "#8a633e",
    summarySeed: "Storage container used to package, move, or organize equipment and materials.",
    build: createCrate,
  },
};

export function resolveCatalogEntry(text) {
  const lower = text.toLowerCase();

  for (const [key, value] of Object.entries(MODEL_LIBRARY)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  return {
    objectType: "training object",
    color: "#4e8cff",
    summarySeed: "General training prop represented as a simplified object for module prototyping.",
    build: createFallbackObject,
  };
}

function createHardHat() {
  const shell = lathe(
    [
      [0.0, 0.0],
      [0.38, 0.04],
      [0.8, 0.14],
      [1.04, 0.34],
      [1.08, 0.55],
      [1.0, 0.78],
      [0.74, 0.95],
      [0.0, 1.0],
    ],
    36
  );
  const brim = ring(1.18, 0.88, -0.04, 24);
  const visor = box(1.3, 0.08, 0.44, [0, -0.05, 0.72]);
  const ridge = box(0.18, 0.78, 0.18, [0, 0.48, 0]);
  const sideBand = box(1.5, 0.1, 0.1, [0, 0.12, 0]);
  return mergeMeshes([shell, brim, visor, ridge, sideBand]);
}

function createHammer() {
  const handle = box(0.18, 1.9, 0.18, [0, -0.2, 0]);
  const head = box(0.9, 0.28, 0.32, [0, 0.95, 0]);
  const claw = box(0.3, 0.18, 0.18, [0.45, 0.95, 0]);
  return mergeMeshes([handle, head, claw]);
}

function createWrench() {
  const body = box(0.22, 2.0, 0.12, [0, 0, 0]);
  const jawTop = box(0.65, 0.18, 0.12, [0, 1.05, 0]);
  const jawBottom = box(0.65, 0.18, 0.12, [0, -1.05, 0]);
  return mergeMeshes([body, jawTop, jawBottom]);
}

function createScrewdriver() {
  const handle = lathe(
    [
      [0.0, -0.55],
      [0.32, -0.48],
      [0.38, -0.15],
      [0.34, 0.15],
      [0.28, 0.45],
      [0.0, 0.52],
    ],
    24
  );
  const shaft = box(0.12, 1.8, 0.12, [0, 1.25, 0]);
  const tip = box(0.2, 0.12, 0.04, [0, 2.15, 0]);
  return mergeMeshes([handle, shaft, tip]);
}

function createTrafficCone() {
  const coneBody = lathe(
    [
      [0.0, -1.0],
      [0.62, -0.96],
      [0.48, 0.15],
      [0.18, 0.95],
      [0.0, 1.0],
    ],
    32
  );
  const base = box(1.45, 0.14, 1.45, [0, -1.05, 0]);
  return mergeMeshes([coneBody, base]);
}

function createBarrel() {
  return lathe(
    [
      [0.0, -1.1],
      [0.58, -1.08],
      [0.72, -0.35],
      [0.78, 0.0],
      [0.72, 0.35],
      [0.58, 1.08],
      [0.0, 1.1],
    ],
    32
  );
}

function createCrate() {
  return box(1.5, 1.2, 1.1, [0, 0, 0]);
}

function createFallbackObject() {
  const body = box(1.2, 1.2, 1.2, [0, 0, 0]);
  const topper = box(0.5, 0.5, 0.5, [0.55, 0.55, 0.55]);
  return mergeMeshes([body, topper]);
}

function box(width, height, depth, offset = [0, 0, 0]) {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  const [ox, oy, oz] = offset;

  const positions = [
    -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
    hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
    -hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd,
    -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd,
    -hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd,
    hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd,
  ];

  const normals = [
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
  ];

  const uvs = new Array(6).fill([0, 0, 1, 0, 1, 1, 0, 1]).flat();
  const indices = [];
  for (let face = 0; face < 6; face += 1) {
    const base = face * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += ox;
    positions[i + 1] += oy;
    positions[i + 2] += oz;
  }

  return { positions, normals, uvs, indices };
}

function lathe(profile, segments) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const rows = profile.length;

  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    for (let j = 0; j < rows; j += 1) {
      const [r, y] = profile[j];
      positions.push(r * cos, y, r * sin);
      normals.push(cos, 0.25, sin);
      uvs.push(i / segments, j / (rows - 1));
    }
  }

  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < rows - 1; j += 1) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      const c = (i + 1) * rows + j + 1;
      const d = i * rows + j + 1;
      indices.push(a, b, c, a, c, d);
    }
  }

  return { positions, normals: normalizeNormals(normals), uvs, indices };
}

function ring(outerRadius, innerRadius, y, segments) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    positions.push(outerRadius * cos, y, outerRadius * sin);
    positions.push(innerRadius * cos, y, innerRadius * sin);
    normals.push(0, -1, 0, 0, -1, 0);
    uvs.push(1, i / segments, 0, i / segments);
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, d, a, d, b);
  }

  return { positions, normals, uvs, indices };
}

function mergeMeshes(meshes) {
  const merged = { positions: [], normals: [], uvs: [], indices: [] };
  let vertexOffset = 0;

  for (const mesh of meshes) {
    merged.positions.push(...mesh.positions);
    merged.normals.push(...mesh.normals);
    merged.uvs.push(...mesh.uvs);
    merged.indices.push(...mesh.indices.map((index) => index + vertexOffset));
    vertexOffset += mesh.positions.length / 3;
  }

  return merged;
}

function normalizeNormals(values) {
  const normals = values.slice();
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i];
    const y = normals[i + 1];
    const z = normals[i + 2];
    const length = Math.hypot(x, y, z) || 1;
    normals[i] = x / length;
    normals[i + 1] = y / length;
    normals[i + 2] = z / length;
  }
  return normals;
}
