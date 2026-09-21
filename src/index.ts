// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { getBaseSize, watchStageScale } from './core/stage';
import { createDeck } from './core/deck';
import type { Deck } from './core/deck';
import { registerMount } from './core/mounts';
import { createNotesPanel } from './core/notes';
import { setupPrintLayers } from './core/print';
import { AnnotationLayer } from './features/annotate';
import { setupAnnotateToolbar } from './features/annotateToolbar';
import { setupFabMenu } from './features/fabMenu';
import { ensureChrome } from './features/chrome';
import { setupYoutubeEmbeds } from './features/youtube';
import { setupYoutubePrintQr } from './features/youtubeQr';
import { renderMath } from './features/katex';
import type { MathRenderer } from './features/katex';
import { setupSound } from './features/sound';
import type { SoundOptions } from './features/sound';
import type { MountDefinition } from './types';
import type { AudioManager } from './audio';

export type { MountDefinition, Deck, SoundOptions, MathRenderer };
export { registerMount };
export * from './audio';

export interface InitOptions {
  /** Root under which #stage/#deck/... are looked up. Defaults to document. */
  root?: ParentNode;
  /** Enables data-music/data-sound playback via src/features/sound.ts. Omit to skip audio entirely (no AudioContext is created unless this is set). */
  sound?: SoundOptions;
  /** Custom renderer for [data-tex] elements. Defaults to the page's KaTeX global (window.katex); without either, [data-tex] is left untouched. */
  renderMath?: MathRenderer;
}

export interface EdoDeck {
  advance(): void;
  retreat(): void;
  goTo(index: number, fragmentIndex?: number): void;
  getCurrent(): number;
  getCurrentFragmentIndex(): number;
  /** Set only when InitOptions.sound was provided. */
  audio: AudioManager | null;
  destroy(): void;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`edodeck: required element "${selector}" not found`);
  return el;
}

/**
 * Wires up existing deck markup into a working presentation. The markup only
 * needs #viewport > #stage > #deck > .slide (see examples/demo.html); the UI
 * around it (drawing layer, FAB menu, progress, dots, ...) is generated
 * here. (The markup itself will later be generated server-side from the
 * shared JSON intermediate state.)
 */
export function init(options: InitOptions = {}): EdoDeck {
  const root = options.root ?? document;

  const viewport = required<HTMLElement>(root, '#viewport');
  const stage = required<HTMLElement>(root, '#stage');
  const deckEl = required<HTMLElement>(root, '#deck');
  const slides = [...deckEl.querySelectorAll<HTMLElement>('.slide')];
  // Canvas, toolbar, FAB menu, progress, dots, timer ring and notes panel are
  // generated here — they're UI, not content, so they don't belong in the
  // slide markup (unless the markup provides one itself, which is then used).
  const chrome = ensureChrome(viewport, stage);
  const { dotsContainer, progressBar, timerRing, timerFill, notesDebug, annotateCanvas } = chrome.elements;

  const stopStageScale = watchStageScale(stage);

  const annotation = new AnnotationLayer(annotateCanvas, stage);
  annotation.resize(getBaseSize(stage));
  setupAnnotateToolbar(root, annotation);

  const notes = createNotesPanel(notesDebug);
  const stopYoutube = setupYoutubeEmbeds(root);
  setupYoutubePrintQr(root);

  const sound = options.sound ? setupSound(options.sound) : null;

  const deck = createDeck(
    { deck: deckEl, slides, dotsContainer, progressBar, timerRing, timerFill },
    notes,
    annotation,
    sound
      ? { onSlideChange: sound.onSlideChange, onFragmentReveal: sound.onFragmentReveal }
      : {}
  );

  const fabMenu = setupFabMenu(root, {
    prev: () => deck.retreat(),
    next: () => deck.advance(),
    fullscreen: () => {
      // Fullscreens #viewport itself, not the whole page — in .inline mode
      // (base.css) that's the difference between the browser tab merely
      // losing its chrome (deck stays whatever small size it had) and the
      // presentation actually taking over the screen: the UA fullscreen
      // styles force #viewport to fill the screen exactly, so
      // watchStageScale()'s resize() (core/stage.ts, which measures
      // #viewport's own size) then rescales the stage to fit it. In the
      // default fullscreen mode this is a no-op change — #viewport already
      // filled the window either way.
      if (!document.fullscreenElement) viewport.requestFullscreen().catch(() => {});
      else document.exitFullscreen();
    },
    notes: () => fabMenu.setActionActive('notes', notes.toggle()),
    annotate: () => {
      const on = !annotation.isActive();
      annotation.setActive(on);
      fabMenu.setActionActive('annotate', on);
    },
    print: () => window.print(),
  });

  const stopPrintLayers = setupPrintLayers(slides, {
    saveCurrent: () => annotation.saveCurrent(deck.getCurrent()),
    getDataUrl: (i) => annotation.getDataUrl(i),
  });

  const onBeforeUnload = (): void => annotation.saveCurrent(deck.getCurrent());
  window.addEventListener('beforeunload', onBeforeUnload);

  // A deck embedded in a page (.inline) must not steal the page's arrow/space
  // scrolling or typing: it only listens while the pointer is over it, focus
  // is inside it, or it is fullscreen. A fullscreen-mode deck owns the page.
  const inline = viewport.classList.contains('inline');
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    if (inline && document.fullscreenElement !== viewport && !viewport.matches(':hover, :focus-within')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      deck.advance();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      deck.retreat();
    } else if (e.key.toLowerCase() === 'n') {
      fabMenu.setActionActive('notes', notes.toggle());
    } else if (e.key === 'Escape' && fabMenu.isOpen()) {
      fabMenu.close();
    }
  };
  window.addEventListener('keydown', onKeydown);

  renderMath(root, options.renderMath);

  return {
    advance: deck.advance,
    retreat: deck.retreat,
    goTo: deck.goTo,
    getCurrentFragmentIndex: deck.getCurrentFragmentIndex,
    getCurrent: deck.getCurrent,
    audio: sound?.audio ?? null,
    destroy: () => {
      stopStageScale();
      stopYoutube();
      stopPrintLayers();
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKeydown);
      deck.destroy();
      chrome.created.forEach((node) => node.remove());
    },
  };
}
