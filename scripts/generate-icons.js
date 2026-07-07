// KPSS PWA icon generator — node scripts/generate-icons.js
// Generates icon-192.png and icon-512.png with "KPSS 2026" text
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const lenB = Buffer.alloc(4); lenB.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(crcData));
  return Buffer.concat([lenB, typeB, data, crcB]);
}
function makePNG(w, h, getPixelRGBA) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y);
      row[1 + x*4] = r; row[2 + x*4] = g; row[3 + x*4] = b; row[4 + x*4] = a;
    }
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(w, 0); IHDR.writeUInt32BE(h, 4);
  IHDR[8]=8; IHDR[9]=6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', IHDR),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// 5×9 pixel font glyphs for K, P, S
const GH = 9;
const FONT = {
  K: [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  P: [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  S: [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
};

// 5×7 font for subtitle digits
const SH = 7;
const DIGITS = {
  2: [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  0: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  6: [[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
};

function buildGlyphSet(chars, font, charH, scale, gap, startX, startY) {
  const set = new Set();
  chars.forEach((ch, ci) => {
    const glyph = font[ch];
    if (!glyph) return;
    const ox = startX + ci * (5 * scale + gap);
    const oy = startY;
    for (let gy = 0; gy < charH; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx]) {
          for (let sy = 0; sy < scale; sy++)
            for (let sx = 0; sx < scale; sx++)
              set.add((ox + gx*scale + sx) + ',' + (oy + gy*scale + sy));
        }
      }
    }
  });
  return set;
}

function makeIcon(size) {
  const radius = Math.round(size * 0.22);
  const topBg = [35, 18, 85];   // deep indigo
  const botBg = [109, 40, 217]; // vivid purple

  // KPSS scale: fit 23px-wide glyphs into ~58% icon width
  const kpssScale = Math.max(2, Math.round((size * 0.58) / 23));
  const kpssGap = Math.max(2, Math.round(kpssScale * 0.7));
  const kpssW = 4 * (5 * kpssScale) + 3 * kpssGap;
  const kpssH = GH * kpssScale;
  const kpssX0 = Math.round((size - kpssW) / 2);
  const kpssY0 = Math.round((size - kpssH) / 2) - Math.round(size * 0.06);

  // 2026 scale: about 35% of kpssScale
  const subScale = Math.max(1, Math.round(kpssScale * 0.35));
  const subGap = Math.max(1, subScale);
  const subW = 4 * (5 * subScale) + 3 * subGap;
  const subX0 = Math.round((size - subW) / 2);
  const subY0 = kpssY0 + kpssH + Math.round(size * 0.045);

  const kpssSet = buildGlyphSet(['K','P','S','S'], FONT, GH, kpssScale, kpssGap, kpssX0, kpssY0);
  const subSet  = buildGlyphSet([2,0,2,6], DIGITS, SH, subScale, subGap, subX0, subY0);

  const cx = (size - 1) / 2, cy = (size - 1) / 2;
  const rMax = size / 2 - radius;

  return makePNG(size, size, (x, y) => {
    // Rounded rectangle mask — transparent outside
    const dx = Math.max(0, Math.abs(x - cx) - rMax);
    const dy = Math.max(0, Math.abs(y - cy) - rMax);
    if (Math.sqrt(dx*dx + dy*dy) > radius) return [0, 0, 0, 0];

    // Diagonal gradient
    const t = (y / (size-1)) * 0.7 + (x / (size-1)) * 0.3;
    const r = Math.round(topBg[0] + (botBg[0]-topBg[0])*t);
    const g = Math.round(topBg[1] + (botBg[1]-topBg[1])*t);
    const b = Math.round(topBg[2] + (botBg[2]-topBg[2])*t);

    const key = x + ',' + y;
    if (kpssSet.has(key)) return [255, 255, 255, 255];      // white KPSS
    if (subSet.has(key))  return [196, 181, 253, 180];      // soft lavender 2026
    return [r, g, b, 255];
  });
}

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), makeIcon(192));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), makeIcon(512));
console.log('Icons generated: assets/icon-192.png and assets/icon-512.png');
