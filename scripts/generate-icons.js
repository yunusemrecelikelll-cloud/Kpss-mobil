// PNG icon üretici — node scripts/generate-icons.js
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t  = Buffer.from(type, 'ascii');
  const d  = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const cd = Buffer.concat([t, d]);
  const c  = uint32BE(crc32(cd));
  return Buffer.concat([uint32BE(d.length), t, d, c]);
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0])
  ]);

  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    const base = y * rowLen;
    raw[base] = 0; // filter None
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Mor: #8b5cf6
const outDir = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), solidPNG(192, 0x8b, 0x5c, 0xf6));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), solidPNG(512, 0x8b, 0x5c, 0xf6));
console.log('icon-192.png ve icon-512.png oluşturuldu.');
