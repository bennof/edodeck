// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { AnnotationLayer } from './annotate';

export function setupAnnotateToolbar(root: ParentNode, layer: AnnotationLayer): void {
  const swatches = [...root.querySelectorAll<HTMLElement>('.swatch')];
  const eraserBtn = root.querySelector<HTMLElement>('#annotate-eraser');
  const clearBtn = root.querySelector<HTMLElement>('#annotate-clear');

  swatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      const color = sw.dataset.color;
      if (!color) return;
      layer.setColor(color);
      eraserBtn?.classList.remove('active');
      swatches.forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  eraserBtn?.addEventListener('click', () => {
    const on = !layer.isErasing();
    layer.setErasing(on);
    eraserBtn.classList.toggle('active', on);
  });

  clearBtn?.addEventListener('click', () => layer.clear());
}
