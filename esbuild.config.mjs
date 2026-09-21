// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');
const minify = process.argv.includes('--minify');

// esbuild drops ordinary comments when minifying; a /*! banner survives, so
// the built files carry the copyright notice too.
const banner = '/*! edodeck — Copyright (c) 2026 Benjamin Benno Falkner — MIT License */';

const jsCommon = {
  bundle: true,
  sourcemap: true,
  target: 'es2020',
  banner: { js: banner, css: banner },
  minify,
  logLevel: 'info',
};

const esmBuild = {
  ...jsCommon,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/edodeck.esm.js',
  format: 'esm',
};

// IIFE build for embedding directly via <script> in any HTML document — no
// bundler/module loader required on the consumer side.
const globalBuild = {
  ...jsCommon,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/edodeck.global.js',
  format: 'iife',
  globalName: 'EdoDeck',
};

// CSS as its own build (instead of via JS import), so consumers simply
// include a .js and a .css file — no CSS-in-JS overhead.
const cssBuild = {
  bundle: true,
  sourcemap: true,
  entryPoints: ['src/styles/index.css'],
  outfile: 'dist/edodeck.css',
  banner: { css: banner },
  minify,
  logLevel: 'info',
};

async function run() {
  if (watch || serve) {
    const ctxs = await Promise.all([context(esmBuild), context(globalBuild), context(cssBuild)]);
    await Promise.all(ctxs.map((c) => c.watch()));

    if (serve) {
      const first = ctxs[0];
      const { port } = await first.serve({ host: '127.0.0.1', servedir: '.', port: 8080 });
      console.log(`edodeck dev server: http://127.0.0.1:${port}/examples/demo.html`);
    } else {
      console.log('watching for changes...');
    }
  } else {
    await Promise.all([build(esmBuild), build(globalBuild), build(cssBuild)]);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
