// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export interface PrintLayerHooks {
  saveCurrent(): void;
  getDataUrl(index: number): string | undefined;
}

/**
 * At runtime only ONE shared canvas overlays the active slide; in print,
 * however, every slide appears simultaneously as its own page. Before
 * printing we therefore insert an <img> per slide with its saved annotation
 * state (see @media print / .print-annotation-layer).
 */
export function setupPrintLayers(slides: HTMLElement[], hooks: PrintLayerHooks): () => void {
  function prepare(): void {
    hooks.saveCurrent();
    slides.forEach((slide, i) => {
      let img = slide.querySelector<HTMLImageElement>('.print-annotation-layer');
      const dataUrl = hooks.getDataUrl(i);
      if (dataUrl) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'print-annotation-layer';
          slide.appendChild(img);
        }
        img.src = dataUrl;
      } else if (img) {
        img.remove();
      }
    });
  }

  window.addEventListener('beforeprint', prepare);
  return () => window.removeEventListener('beforeprint', prepare);
}
