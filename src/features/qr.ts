// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

// A small QR Code encoder, just big enough for the print fallback of video
// embeds: byte mode, error correction level M, versions 1–10 (URLs of up to
// 213 bytes). Anything longer is refused rather than half-supported.
//
// Follows ISO/IEC 18004: data bit stream → Reed-Solomon blocks over GF(256)
// (x⁸+x⁴+x³+x²+1) → interleaving → function patterns → zigzag placement →
// the best of the 8 masks → format and version information.

const MAX_VERSION = 10;

// Error correction level M, per version: [EC codewords per block, blocks of
// group 1, data codewords per group-1 block, blocks of group 2, data
// codewords per group-2 block].
const BLOCKS: number[][] = [
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
];

// ---- Reed-Solomon over GF(256) ----

const EXP: number[] = [];
const LOG: number[] = [];
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}

function mul(a: number, b: number): number {
  return a && b ? EXP[(LOG[a]! + LOG[b]!) % 255]! : 0;
}

/** The n error correction codewords for `data`. */
function reedSolomon(data: number[], n: number): number[] {
  let gen = [1]; // generator polynomial, (x - α⁰)(x - α¹)…(x - αⁿ⁻¹)
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    gen.forEach((c, j) => {
      next[j]! ^= c;
      next[j + 1]! ^= mul(c, EXP[i]!);
    });
    gen = next;
  }
  const rem = new Array<number>(n).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem.shift()!;
    rem.push(0);
    for (let i = 0; i < n; i++) rem[i]! ^= mul(gen[i + 1]!, factor);
  }
  return rem;
}

// ---- Data → codewords ----

function dataCodewords(version: number): number {
  const [, n1, d1, n2, d2] = BLOCKS[version - 1]!;
  return n1! * d1! + n2! * d2!;
}

/** Bit stream (mode, length, bytes, terminator, padding) split into RS
 * blocks, with the error correction appended and everything interleaved. */
function codewords(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const put = (value: number, count: number): void => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(0b0100, 4); // byte mode
  put(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));

  const capacity = dataCodewords(version) * 8;
  put(0, Math.min(4, capacity - bits.length)); // terminator
  put(0, (8 - (bits.length % 8)) % 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  }
  for (let pad = 0xec; data.length < dataCodewords(version); pad ^= 0xec ^ 0x11) data.push(pad);

  const [ecLen, n1, d1, n2, d2] = BLOCKS[version - 1]!;
  const blocks: number[][] = [];
  let at = 0;
  for (let i = 0; i < n1! + n2!; i++) {
    const size = i < n1! ? d1! : d2!;
    blocks.push(data.slice(at, at + size));
    at += size;
  }
  const ecs = blocks.map((b) => reedSolomon(b, ecLen!));

  const out: number[] = [];
  for (let i = 0; i < Math.max(d1!, d2!); i++) blocks.forEach((b) => i < b.length && out.push(b[i]!));
  for (let i = 0; i < ecLen!; i++) ecs.forEach((e) => out.push(e[i]!));
  return out;
}

// ---- Matrix ----

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** BCH-protected 15-bit format information (level M = 00) for `mask`. */
function formatBits(mask: number): number {
  let rem = mask; // (00 << 3) | mask
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((mask << 10) | rem) ^ 0x5412;
}

/** BCH-protected 18-bit version information (versions 7 and up). */
function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  let dark = 0;
  const line = (get: (i: number) => boolean): void => {
    let run = 1;
    for (let i = 1; i < n; i++) {
      run = get(i) === get(i - 1) ? run + 1 : 1;
      if (run === 5) score += 3;
      else if (run > 5) score++;
    }
    // finder-like 1:1:3:1:1 with 4 light modules on one side
    const bit = (i: number): number => (i < 0 || i >= n ? 0 : get(i) ? 1 : 0);
    for (let i = -4; i + 10 < n + 4; i++) {
      const w = [1, 0, 1, 1, 1, 0, 1].every((v, k) => bit(i + 4 + k) === v);
      const before = [0, 0, 0, 0].every((_, k) => bit(i + k) === 0);
      const after = [0, 0, 0, 0].every((_, k) => bit(i + 11 + k) === 0);
      if (w && (before || after)) score += 40;
    }
  };
  for (let a = 0; a < n; a++) {
    line((i) => m[a]![i]!);
    line((i) => m[i]![a]!);
    for (let b = 0; b < n; b++) {
      if (m[a]![b]) dark++;
      if (a + 1 < n && b + 1 < n && m[a]![b] === m[a]![b + 1] && m[a]![b] === m[a + 1]![b] && m[a]![b] === m[a + 1]![b + 1]) score += 3;
    }
  }
  return score + 10 * Math.max(0, Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1);
}

/**
 * The QR code for `text` as a square of dark (true) / light modules, or null
 * if it doesn't fit version 10 (213 bytes). `forceMask` picks one of the 8
 * masks instead of the best one — for tests.
 */
export function qrMatrix(text: string, forceMask?: number): boolean[][] | null {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 1;
  while (version <= MAX_VERSION && 4 + (version < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(version) * 8) version++;
  if (version > MAX_VERSION) return null;

  const size = 17 + 4 * version;
  const cells: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFixed = (x: number, y: number, dark: boolean): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    cells[y]![x] = dark;
    fixed[y]![x] = true;
  };

  // timing patterns
  for (let i = 0; i < size; i++) {
    setFixed(6, i, i % 2 === 0);
    setFixed(i, 6, i % 2 === 0);
  }
  // finder patterns with their light separators
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setFixed(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
    }
  }
  // alignment patterns (none in version 1)
  const count = version === 1 ? 0 : Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const align = count ? [6] : [];
  for (let pos = size - 7; align.length < count; pos -= step) align.splice(1, 0, pos);
  align.forEach((cy, i) =>
    align.forEach((cx, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === count - 1) || (i === count - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFixed(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    })
  );
  // version information (two copies)
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFixed(a, b, dark);
      setFixed(b, a, dark);
    }
  }
  const drawFormat = (mask: number): void => {
    const bits = formatBits(mask);
    const bit = (i: number): boolean => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) setFixed(8, i, bit(i));
    setFixed(8, 7, bit(6));
    setFixed(8, 8, bit(7));
    setFixed(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFixed(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setFixed(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFixed(8, size - 15 + i, bit(i));
    setFixed(8, size - 8, true); // the always-dark module
  };
  drawFormat(0); // reserves the format areas

  // data, zigzag from the bottom right in pairs of columns, skipping column 6
  const data = codewords(bytes, version);
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!fixed[y]![x] && i < data.length * 8) {
          cells[y]![x] = ((data[i >>> 3]! >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
  }

  const withMask = (mask: number): boolean[][] => {
    const saved = cells.map((row) => row.slice());
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (!fixed[y]![x] && MASKS[mask]!(x, y)) cells[y]![x] = !cells[y]![x];
    }
    drawFormat(mask);
    const result = cells.map((row) => row.slice());
    cells.forEach((row, y) => row.splice(0, size, ...saved[y]!));
    return result;
  };
  if (forceMask !== undefined) return withMask(forceMask);

  let best: boolean[][] = [];
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = withMask(mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/** The QR code for `text` as a scalable SVG with a 4-module quiet zone, or
 * null if the text is too long. Plain vector shapes, so it prints reliably. */
export function qrSvg(text: string): string | null {
  const m = qrMatrix(text);
  if (!m) return null;
  const quiet = 4;
  const total = m.length + 2 * quiet;
  let path = '';
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let end = x;
      while (row[end + 1]) end++;
      path += `M${x + quiet} ${y + quiet}h${end - x + 1}v1h-${end - x + 1}z`;
      x = end;
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
  );
}
