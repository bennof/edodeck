// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import qrcode from 'qrcode-generator'; // dev dependency: the reference encoder

async function importSource(name) {
  const { outputFiles } = await build({
    entryPoints: [new URL(`../src/${name}.ts`, import.meta.url).pathname],
    bundle: true, write: false, platform: 'node', format: 'esm',
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const { qrMatrix, qrSvg } = await importSource('features/qr');

/** The reference library's code for `text`, byte mode, level M, smallest version. */
function reference(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => qr.isDark(y, x)));
}

const same = (a, b) => a.length === b.length && a.every((row, y) => row.every((v, x) => v === b[y][x]));

/** Text of exactly `length` URL-ish bytes, varied so blocks differ. */
function sample(length, seed) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:/?#[]@!$&()*+,;=%';
  let s = 'https://';
  let h = seed * 2654435761 >>> 0;
  while (s.length < length) {
    h = (h * 1664525 + 1013904223) >>> 0;
    s += chars[h % chars.length];
  }
  return s.slice(0, length);
}

test('matches the reference encoder for every text length up to 213 bytes (all versions 1-10)', () => {
  for (let length = 1; length <= 213; length++) {
    const text = length < 8 ? 'x'.repeat(length) : sample(length, length);
    const ref = reference(text);
    // Mask choice among equally valid masks may differ from the reference;
    // everything else (data, error correction, patterns, format) must match
    // the reference under one of the 8 masks.
    const masks = [0, 1, 2, 3, 4, 5, 6, 7].filter((m) => same(qrMatrix(text, m), ref));
    assert.equal(masks.length, 1, `length ${length}: no matching mask`);
  }
});

test('the automatic mask choice is one of the valid masks', () => {
  for (const text of ['https://youtu.be/aqz-KE-bpKQ', 'https://example.org/some/longer/path?with=query&and=more']) {
    const best = qrMatrix(text);
    assert.ok([0, 1, 2, 3, 4, 5, 6, 7].some((m) => same(qrMatrix(text, m), best)));
  }
});

test('picks the smallest version and refuses text that does not fit version 10', () => {
  assert.equal(qrMatrix('x'.repeat(14)).length, 21);   // v1
  assert.equal(qrMatrix('x'.repeat(15)).length, 25);   // v2
  assert.equal(qrMatrix('x'.repeat(213)).length, 57);  // v10
  assert.equal(qrMatrix('x'.repeat(214)), null);
  assert.equal(qrSvg('x'.repeat(214)), null);
});

test('qrSvg is a self-contained vector image', () => {
  const svg = qrSvg('https://youtu.be/aqz-KE-bpKQ');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 37 37"/);
  assert.match(svg, /<path d="M/);
  assert.ok(!svg.includes('<image'));
});

test('the SVG path draws exactly the dark modules of the matrix', () => {
  const text = 'https://youtu.be/aqz-KE-bpKQ';
  const matrix = qrMatrix(text);
  const total = matrix.length + 8;
  const drawn = Array.from({ length: total }, () => new Array(total).fill(false));
  for (const [, x, y, w] of qrSvg(text).matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g).map((m) => [m[0], +m[1], +m[2], +m[3]])) {
    for (let i = 0; i < w; i++) drawn[y][x + i] = true;
  }
  matrix.forEach((row, y) => row.forEach((dark, x) => assert.equal(drawn[y + 4][x + 4], dark, `module ${x},${y}`)));
  assert.equal(drawn.flat().filter(Boolean).length, matrix.flat().filter(Boolean).length);
});
