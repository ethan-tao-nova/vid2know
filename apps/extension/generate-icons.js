#!/usr/bin/env node
/**
 * Generates the extension's PNG icons (16/48/128) without any dependencies.
 * Draws a rounded teal tile with a light film-strip glyph — matching the
 * Vid2Know brand accent (#0f6e56).
 *
 * Usage: node generate-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ACCENT = [15, 110, 86]; // #0f6e56
const ACCENT_LIGHT = [61, 186, 143]; // #3dba8f
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixelFn) {
  const bytesPerPixel = 4;
  const stride = size * bytesPerPixel;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const off = y * (stride + 1) + 1 + x * bytesPerPixel;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makePixelFn(size) {
  const radius = size * 0.22;
  const inset = size * 0.16;
  const stripW = size * 0.06;
  return (x, y) => {
    // Rounded-corner mask.
    const inCorner = (cx, cy) =>
      (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2;
    if (
      (x < radius && y < radius && inCorner(radius, radius)) ||
      (x > size - radius && y < radius && inCorner(size - radius, radius)) ||
      (x < radius && y > size - radius && inCorner(radius, size - radius)) ||
      (x > size - radius &&
        y > size - radius &&
        inCorner(size - radius, size - radius))
    ) {
      return [0, 0, 0, 0];
    }

    // Diagonal accent gradient.
    const t = (x + y) / (2 * size);
    const bg = ACCENT.map((c, i) =>
      Math.round(c + (ACCENT_LIGHT[i] - c) * t)
    );

    // Film strip frame + play triangle in white.
    const withinFrame =
      x > inset && x < size - inset && y > inset && y < size - inset;
    const onBorder =
      withinFrame &&
      (x < inset + stripW ||
        x > size - inset - stripW ||
        y < inset + stripW ||
        y > size - inset - stripW);

    // Play triangle centered.
    const cx = size * 0.42;
    const half = size * 0.16;
    const inTriangle =
      x > cx &&
      x < cx + half * 1.4 &&
      Math.abs(y - size / 2) < ((x - cx) / (half * 1.4)) * half;

    if (onBorder || inTriangle) {
      return [...WHITE, 255];
    }
    return [...bg, 255];
  };
}

function main() {
  const outDir = path.join(__dirname, "icons");
  fs.mkdirSync(outDir, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    const png = encodePng(size, makePixelFn(size));
    const file = path.join(outDir, `icon${size}.png`);
    fs.writeFileSync(file, png);
    console.log(`wrote ${file} (${png.length} bytes)`);
  }
}

main();
