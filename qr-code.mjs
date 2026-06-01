import { deflateSync } from "node:zlib";

const VERSION = 5;
const SIZE = 21 + VERSION * 4;
const DATA_CODEWORDS = 108;
const ECC_CODEWORDS = 26;
const MASK = 0;
const ECL_FORMAT_BITS = 1;

function gfMultiply(x, y) {
  let product = 0;
  while (y > 0) {
    if (y & 1) product ^= x;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
    y >>>= 1;
  }
  return product;
}

function reedSolomonDivisor(degree) {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    for (let item = 0; item < degree; item += 1) {
      result[item] = gfMultiply(result[item], root);
      if (item + 1 < degree) result[item] ^= result[item + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data, divisor) {
  const result = Array(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

function appendBits(bits, value, length) {
  for (let shift = length - 1; shift >= 0; shift -= 1) {
    bits.push((value >>> shift) & 1);
  }
}

function makeCodewords(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > 100) {
    throw new Error("QR target is too long for this compact generator.");
  }

  const bits = [];
  appendBits(bits, 0x4, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const capacityBits = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8) bits.push(0);

  const codewords = [];
  for (let index = 0; index < bits.length; index += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) byte = (byte << 1) | bits[index + bit];
    codewords.push(byte);
  }
  for (let pad = 0xec; codewords.length < DATA_CODEWORDS; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }

  return codewords;
}

function makeMatrix() {
  const modules = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const functionModules = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  const setFunction = (x, y, dark) => {
    if (!inBounds(x, y)) return;
    modules[y][x] = Boolean(dark);
    functionModules[y][x] = true;
  };

  const drawFinder = (x, y) => {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const xx = x + dx;
        const yy = y + dy;
        const ring = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
        setFunction(xx, yy, ring);
      }
    }
  };

  const drawAlignment = (cx, cy) => {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, distance !== 1);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(SIZE - 7, 0);
  drawFinder(0, SIZE - 7);

  const alignment = [6, 30];
  for (const y of alignment) {
    for (const x of alignment) {
      if (functionModules[y]?.[x]) continue;
      drawAlignment(x, y);
    }
  }

  for (let index = 8; index < SIZE - 8; index += 1) {
    setFunction(6, index, index % 2 === 0);
    setFunction(index, 6, index % 2 === 0);
  }

  for (let index = 0; index <= 8; index += 1) {
    if (index !== 6) {
      setFunction(8, index, false);
      setFunction(index, 8, false);
    }
  }
  for (let index = SIZE - 8; index < SIZE; index += 1) setFunction(index, 8, false);
  for (let index = SIZE - 7; index < SIZE; index += 1) setFunction(8, index, false);
  setFunction(8, SIZE - 8, true);

  return { modules, functionModules, setFunction };
}

function formatBits(mask) {
  const data = (ECL_FORMAT_BITS << 3) | mask;
  let remainder = data;
  for (let index = 0; index < 10; index += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) ? 0x537 : 0);
  }
  return ((data << 10) | (remainder & 0x3ff)) ^ 0x5412;
}

function drawFormat(matrix) {
  const bits = formatBits(MASK);
  const bit = (index) => ((bits >>> index) & 1) !== 0;
  for (let index = 0; index <= 5; index += 1) matrix.setFunction(8, index, bit(index));
  matrix.setFunction(8, 7, bit(6));
  matrix.setFunction(8, 8, bit(7));
  matrix.setFunction(7, 8, bit(8));
  for (let index = 9; index < 15; index += 1) matrix.setFunction(14 - index, 8, bit(index));
  for (let index = 0; index < 8; index += 1) matrix.setFunction(SIZE - 1 - index, 8, bit(index));
  for (let index = 8; index < 15; index += 1) matrix.setFunction(8, SIZE - 15 + index, bit(index));
  matrix.setFunction(8, SIZE - 8, true);
}

function placeData(matrix, codewords) {
  const bits = [];
  codewords.forEach((byte) => appendBits(bits, byte, 8));
  let bitIndex = 0;
  let upward = true;

  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vert = 0; vert < SIZE; vert += 1) {
      const y = upward ? SIZE - 1 - vert : vert;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (matrix.functionModules[y][x]) continue;
        const bit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        const masked = bit !== ((x + y) % 2 === 0);
        matrix.modules[y][x] = masked;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

export function createQrMatrix(text) {
  const dataCodewords = makeCodewords(text);
  const errorCodewords = reedSolomonRemainder(dataCodewords, reedSolomonDivisor(ECC_CODEWORDS));
  const matrix = makeMatrix();
  placeData(matrix, [...dataCodewords, ...errorCodewords]);
  drawFormat(matrix);
  return matrix.modules;
}

export function createQrSvg(text, options = {}) {
  const modules = createQrMatrix(text);

  const quiet = options.quietZone ?? 4;
  const moduleSize = options.moduleSize ?? 10;
  const imageSize = (SIZE + quiet * 2) * moduleSize;
  const foreground = options.foreground || "#050509";
  const background = options.background || "#ffffff";
  const title = options.title || "Nakaru-San app download QR code";
  const rectangles = [];

  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        rectangles.push(`<rect x="${(x + quiet) * moduleSize}" y="${(y + quiet) * moduleSize}" width="${moduleSize}" height="${moduleSize}" rx="1" />`);
      }
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${imageSize}" height="${imageSize}" viewBox="0 0 ${imageSize} ${imageSize}" role="img" aria-label="${title}">
  <title>${title}</title>
  <rect width="100%" height="100%" fill="${background}" />
  <g fill="${foreground}" shape-rendering="crispEdges">
    ${rectangles.join("\n    ")}
  </g>
</svg>
`;
}

export function createQrDataUrl(text, options = {}) {
  const svg = createQrSvg(text, options);
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function hexToRgba(hex) {
  const clean = String(hex || "#000000").replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
    255
  ];
}

export function createQrPngBuffer(text, options = {}) {
  const modules = createQrMatrix(text);
  const quiet = options.quietZone ?? 4;
  const moduleSize = options.moduleSize ?? 12;
  const foreground = hexToRgba(options.foreground || "#050509");
  const background = hexToRgba(options.background || "#ffffff");
  const size = (SIZE + quiet * 2) * moduleSize;
  const raw = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    const moduleY = Math.floor(y / moduleSize) - quiet;
    for (let x = 0; x < size; x += 1) {
      const moduleX = Math.floor(x / moduleSize) - quiet;
      const dark = moduleX >= 0 && moduleY >= 0 && moduleX < SIZE && moduleY < SIZE && modules[moduleY][moduleX];
      const color = dark ? foreground : background;
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND")
  ]);
}
