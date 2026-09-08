// Genera iconos PWA (192x192 y 512x512) sin dependencias externas.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    for (let x = 0; x < width * 4; x++) raw[y * (width * 4 + 1) + 1 + x] = rgba[y * width * 4 + x];
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Bitmap de "F" 5x7
const F = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
];

function makeIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = [37, 99, 235, 255]; // blue-600
  const fg = [255, 255, 255, 255];
  const scale = Math.floor(size / 20);
  const x0 = Math.floor(size * 0.32);
  const y0 = Math.floor(size * 0.3);
  const cell = Math.floor(size / 32);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // fondo con esquinas redondeadas
      const r = Math.floor(size * 0.18);
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      let alpha = 255;
      if (dx < r && dy < r) {
        const dist = Math.sqrt((r - dx) ** 2 + (r - dy) ** 2);
        if (dist > r + 1) alpha = 0;
        else if (dist > r - 1) alpha = Math.round(255 * (r + 1 - dist));
      }
      buf[i] = bg[0];
      buf[i + 1] = bg[1];
      buf[i + 2] = bg[2];
      buf[i + 3] = alpha;
    }
  }
  // draw F
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (!F[row][col]) continue;
      for (let yy = 0; yy < cell; yy++) {
        for (let xx = 0; xx < cell; xx++) {
          const px = x0 + col * cell + xx;
          const py = y0 + row * cell + yy;
          if (px < size && py < size) {
            const i = (py * size + px) * 4;
            buf[i] = fg[0];
            buf[i + 1] = fg[1];
            buf[i + 2] = fg[2];
            buf[i + 3] = 255;
          }
        }
      }
    }
  }
  return encodePng(size, size, buf);
}

const outDir = path.join(process.cwd(), 'frontend', 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), makeIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), makeIcon(512));
fs.writeFileSync(
  path.join(outDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#2563eb"/><text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="#fff" text-anchor="middle">F</text></svg>`
);
console.log('Iconos PWA generados en', outDir);