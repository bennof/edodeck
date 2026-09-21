// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import {
  getFragmentIndex,
  hideLastFragment,
  resetFragments,
  revealFragmentsUpTo,
  revealNextFragment,
  setupFragments,
} from './fragments';
import { handleMounts } from './mounts';
import { createAutoAdvance } from './autoAdvance';
import { handleYoutubeAutoplay } from '../features/youtube';
import type { AnnotationLayer } from '../features/annotate';
import type { NotesPanel } from './notes';

export interface DeckElements {
  deck: HTMLElement;
  slides: HTMLElement[];
  dotsContainer: HTMLElement;
  progressBar: HTMLElement;
  timerRing: SVGSVGElement;
  timerFill: SVGCircleElement;
}

export interface DeckHooks {
  onSlideChange?(index: number, slide: HTMLElement): void;
  /** Fires when advance() reveals a fragment (not on deep-link jumps via goTo's fragmentIndex). */
  onFragmentReveal?(el: HTMLElement): void;
}

export interface Deck {
  advance(): void;
  retreat(): void;
  goTo(index: number, fragmentIndex?: number): void;
  getCurrent(): number;
  getCurrentFragmentIndex(): number;
  destroy(): void;
}

/**
 * Central deck state: navigation (advance/retreat/goTo), dots, progress bar,
 * and the IntersectionObserver that derives the active index from the
 * scroll-snap deck. advance()/retreat() first reveal/hide any open fragments
 * on the current slide before jumping to the neighboring slide — free
 * scrolling/swiping deliberately bypasses that.
 */
export function createDeck(
  els: DeckElements,
  notes: NotesPanel,
  annotation: AnnotationLayer,
  hooks: DeckHooks = {}
): Deck {
  const { deck, slides, dotsContainer, progressBar, timerRing, timerFill } = els;
  let current = 0;

  slides.forEach(setupFragments);

  const dotEls = slides.map((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
    return dot;
  });

  const autoAdvance = createAutoAdvance(timerRing, timerFill, () => advance());

  // Set by goTo() when a fragmentIndex is requested for a slide other than
  // the current one — scrollIntoView() is async, so the actual reveal has to
  // wait until setActive() fires for that slide (see the IntersectionObserver
  // below). Consumed exactly once, regardless of match.
  let pendingFragmentTarget: { slideIndex: number; fragmentIndex: number } | null = null;

  /**
   * fragmentIndex, if given, deep-links straight to that fragment step
   * (-1 = none revealed, 0 = first fragment revealed, ...) instead of
   * requiring revealNextFragment() to be stepped through one at a time.
   */
  function goTo(index: number, fragmentIndex?: number): void {
    index = Math.max(0, Math.min(index, slides.length - 1));

    if (index === current) {
      if (fragmentIndex !== undefined) revealFragmentsUpTo(slides[index]!, fragmentIndex);
      return;
    }

    if (fragmentIndex !== undefined) {
      pendingFragmentTarget = { slideIndex: index, fragmentIndex };
    }
    slides[index]!.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function advance(): void {
    const revealed = revealNextFragment(slides[current]!);
    if (revealed) {
      hooks.onFragmentReveal?.(revealed);
      return;
    }
    goTo(current + 1);
  }

  function retreat(): void {
    if (hideLastFragment(slides[current]!)) return;
    goTo(current - 1);
  }

  // Scroll-snap aligns to the *transformed* box of a slide, and a slide that
  // isn't active yet still carries its "enter" transform (translateY/scale,
  // see transitions.css). The deck therefore comes to rest a few percent too
  // far down — the moment the slide activates and the transform is gone, a
  // strip of the next slide shows at the bottom. Once scrolling has settled,
  // put the current slide exactly at the top.
  const onScrollEnd = (): void => {
    const top = slides[current]!.offsetTop - deck.offsetTop;
    if (Math.abs(deck.scrollTop - top) > 2) deck.scrollTo({ top, behavior: 'instant' });
  };
  deck.addEventListener('scrollend', onScrollEnd);

  function setActive(index: number): void {
    if (index !== current) annotation.saveCurrent(current);
    current = index;
    const slide = slides[index]!;

    dotEls.forEach((d, i) => d.classList.toggle('active', i === index));
    slides.forEach((s, i) => s.classList.toggle('slide-active', i === index));
    progressBar.style.width = ((index + 1) / slides.length) * 100 + '%';
    notes.update(slide);
    handleMounts(slides, index);
    handleYoutubeAutoplay(slides, index);
    resetFragments(slide);
    const pending = pendingFragmentTarget;
    pendingFragmentTarget = null;
    if (pending && pending.slideIndex === index) revealFragmentsUpTo(slide, pending.fragmentIndex);
    autoAdvance.start(slide);
    annotation.clear();
    annotation.restore(index);
    hooks.onSlideChange?.(index, slide);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const idx = slides.indexOf(entry.target as HTMLElement);
          if (idx !== -1 && idx !== current) setActive(idx);
        }
      });
    },
    { root: deck, threshold: [0.6] }
  );
  slides.forEach((s) => io.observe(s));

  setActive(0);

  return {
    advance,
    retreat,
    goTo,
    getCurrent: () => current,
    getCurrentFragmentIndex: () => getFragmentIndex(slides[current]!),
    destroy: () => {
      io.disconnect();
      deck.removeEventListener('scrollend', onScrollEnd);
      autoAdvance.stop();
    },
  };
}
