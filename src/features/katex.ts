// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

// The math engine is not part of this library: KaTeX is provided by the host
// page as the global `katex` (katex.min.js, loaded before edodeck.global.js).
// Without it, [data-tex] elements are left untouched. Another engine (e.g.
// MathJax) can be plugged in via init({ renderMath }).

/** Renders one [data-tex] element. Custom hook for init({ renderMath }). */
export type MathRenderer = (el: HTMLElement, tex: string) => void;

interface KatexGlobal {
  render(tex: string, el: HTMLElement, options?: object): void;
}

declare global {
  interface Window {
    /** KaTeX's katex.min.js. */
    katex?: KatexGlobal;
  }
}

/** Renders every [data-tex] element under root once, via the custom renderer
 * or the page's KaTeX. */
export function renderMath(root: ParentNode, custom?: MathRenderer): void {
  const render: MathRenderer | undefined =
    custom ??
    (window.katex
      ? (el, tex) => window.katex!.render(tex, el, { throwOnError: false, displayMode: true })
      : undefined);
  if (!render) return;
  root.querySelectorAll<HTMLElement>('[data-tex]').forEach((el) => {
    const tex = el.dataset.tex;
    if (!tex) return;
    try {
      render(el, tex);
    } catch (e) {
      el.textContent = 'KaTeX-Fehler: ' + (e instanceof Error ? e.message : String(e));
    }
  });
}
