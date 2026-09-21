// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export interface Size {
  w: number;
  h: number;
}

/**
 * The target resolution is not a JS constant — it lives as --slide-w/--slide-h
 * on the stage element (via a .res-* class or inline style) and is read live,
 * so swapping the class on the stage is enough to change the format.
 */
export function getBaseSize(stage: HTMLElement): Size {
  const cs = getComputedStyle(stage);
  const w = parseFloat(cs.getPropertyValue('--slide-w'));
  const h = parseFloat(cs.getPropertyValue('--slide-h'));
  return { w: w || 1280, h: h || 720 };
}

/**
 * Computes a single scale factor on every resize and applies it to the stage
 * via transform:scale(), so the presentation looks identical on any
 * device/projector. --stage-counter-scale compensates the scaling for UI
 * chrome that should stay tappable regardless.
 *
 * Measures the stage's own parent element (#viewport per the required
 * markup) rather than window.innerWidth/innerHeight, so this works both in
 * the default fullscreen mode (#viewport is exactly window-sized then, so
 * behavior is unchanged) and in the "inline" mode (#viewport.inline, see
 * base.css) where the deck is embedded as one element on a larger page.
 */
export function watchStageScale(stage: HTMLElement): () => void {
  const container = stage.parentElement;

  function resize(): void {
    const { w, h } = getBaseSize(stage);
    const containerW = container?.clientWidth || window.innerWidth;
    const containerH = container?.clientHeight || window.innerHeight;
    const scale = Math.min(containerW / w, containerH / h);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    stage.style.setProperty('--stage-counter-scale', String(1 / scale));
  }

  window.addEventListener('resize', resize);
  resize();

  return () => window.removeEventListener('resize', resize);
}
