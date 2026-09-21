// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

// The deck's UI chrome — drawing canvas and toolbar, FAB menu, progress bar,
// dots, timer ring, notes panel — is not content, so it is not part of the
// slide markup. init() calls ensureChrome() to generate whatever is missing
// inside #viewport (markup that already provides an element is used as is).

import { stringsFor } from '../strings';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Shape = [tag: string, attrs: Record<string, string>];

const ICONS = {
  eraser: [['path', { d: 'M20 20H8l-6-6a2 2 0 0 1 0-2.8l9-9a2 2 0 0 1 2.8 0l6 6a2 2 0 0 1 0 2.8L13 18' }]],
  clear: [
    ['polyline', { points: '3 6 5 6 21 6' }],
    ['path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }],
  ],
  toggle: [
    ['line', { x1: '12', y1: '5', x2: '12', y2: '19' }],
    ['line', { x1: '5', y1: '12', x2: '19', y2: '12' }],
  ],
  prev: [['polyline', { points: '15 18 9 12 15 6' }]],
  next: [['polyline', { points: '9 18 15 12 9 6' }]],
  fullscreen: [
    ['path', { d: 'M8 3H5a2 2 0 0 0-2 2v3' }],
    ['path', { d: 'M21 8V5a2 2 0 0 0-2-2h-3' }],
    ['path', { d: 'M3 16v3a2 2 0 0 0 2 2h3' }],
    ['path', { d: 'M16 21h3a2 2 0 0 0 2-2v-3' }],
  ],
  notes: [['path', { d: 'M4 4h16v12H8l-4 4z' }]],
  annotate: [
    ['path', { d: 'M12 20h9' }],
    ['path', { d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' }],
  ],
  print: [
    ['polyline', { points: '6 9 6 2 18 2 18 9' }],
    ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }],
    ['rect', { x: '6', y: '14', width: '12', height: '8' }],
  ],
} satisfies Record<string, Shape[]>;

function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  return el;
}

function icon(shapes: Shape[]): SVGElement {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  shapes.forEach(([tag, attrs]) => svg.appendChild(svgEl(tag, attrs)));
  return svg;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Node[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

function button(className: string, label: string, shapes: Shape[], attrs: Record<string, string> = {}): HTMLButtonElement {
  return el('button', { class: className, 'aria-label': label, ...attrs }, [icon(shapes)]);
}

export interface ChromeElements {
  annotateCanvas: HTMLCanvasElement;
  dotsContainer: HTMLElement;
  progressBar: HTMLElement;
  timerRing: SVGSVGElement;
  timerFill: SVGCircleElement;
  notesDebug: HTMLElement;
}

export interface Chrome {
  elements: ChromeElements;
  /** Elements that were generated (not already in the markup) — removed again on destroy. */
  created: Element[];
}

const SWATCH_COLORS = ['#ff5c5c', '#ffd23f', '#6fa8ff', '#ffffff'];

/** Finds each chrome element inside the viewport, generating the ones the
 * markup doesn't provide. Children of #stage (canvas, toolbar, FAB menu) are
 * scaled with it; the rest are children of #viewport itself, so they keep a
 * constant real size (see chrome.css). */
export function ensureChrome(viewport: HTMLElement, stage: HTMLElement): Chrome {
  const created: Element[] = [];
  const t = stringsFor(viewport);

  function ensure<T extends Element>(parent: HTMLElement, selector: string, make: () => T): T {
    const existing = viewport.querySelector<T>(selector);
    if (existing) return existing;
    const node = make();
    parent.appendChild(node);
    created.push(node);
    return node;
  }

  // -- in #stage
  const annotateCanvas = ensure(stage, '#annotate-canvas', () => el('canvas', { id: 'annotate-canvas' }));

  ensure(stage, '#annotate-toolbar', () =>
    el('div', { id: 'annotate-toolbar' }, [
      ...SWATCH_COLORS.map((color, i) =>
        el('div', { class: i === 0 ? 'swatch active' : 'swatch', 'data-color': color, style: `background:${color}` })
      ),
      button('annotate-tool-btn', t.eraser, ICONS.eraser, { id: 'annotate-eraser' }),
      button('annotate-tool-btn', t.clearAll, ICONS.clear, { id: 'annotate-clear' }),
    ])
  );

  // The items sit in a row-reverse flex row, so the first one is displayed
  // closest to the toggle and the row reads right to left: next is placed
  // before prev so that on screen it reads  ◀ ▶ +  (and not ▶ ◀ +).
  ensure(stage, '#fab-menu', () =>
    el('div', { id: 'fab-menu' }, [
      button('fab-btn', t.openMenu, ICONS.toggle, { id: 'fab-toggle' }),
      el('div', { id: 'fab-items' }, [
        button('fab-btn', t.next, ICONS.next, { 'data-action': 'next' }),
        button('fab-btn', t.prev, ICONS.prev, { 'data-action': 'prev' }),
        button('fab-btn', t.fullscreen, ICONS.fullscreen, { 'data-action': 'fullscreen' }),
        button('fab-btn', t.notes, ICONS.notes, { 'data-action': 'notes' }),
        button('fab-btn', t.annotate, ICONS.annotate, { 'data-action': 'annotate' }),
        button('fab-btn', t.print, ICONS.print, { 'data-action': 'print' }),
      ]),
    ])
  );

  // -- in #viewport
  const progress = ensure(viewport, '#progress', () => el('div', { id: 'progress' }, [el('div', { id: 'progress-bar' })]));
  const progressBar = progress.querySelector<HTMLElement>('#progress-bar') ?? progress.appendChild(el('div', { id: 'progress-bar' }));

  const dotsContainer = ensure(viewport, '#dots', () => el('div', { id: 'dots' }));

  const timerRing = ensure(viewport, '#timer-ring', () => {
    const ring = svgEl('svg', { id: 'timer-ring', viewBox: '0 0 36 36' }) as SVGSVGElement;
    ring.append(
      svgEl('circle', { class: 'track', cx: '18', cy: '18', r: '15' }),
      svgEl('circle', { class: 'fill', cx: '18', cy: '18', r: '15', 'stroke-dasharray': '94.2', 'stroke-dashoffset': '94.2' })
    );
    return ring;
  });
  const timerFill = timerRing.querySelector<SVGCircleElement>('.fill');
  if (!timerFill) throw new Error('edodeck: #timer-ring needs a .fill circle');

  const notesDebug = ensure(viewport, '#notes-debug', () => el('div', { id: 'notes-debug' }));

  return { elements: { annotateCanvas, dotsContainer, progressBar, timerRing, timerFill, notesDebug }, created };
}
