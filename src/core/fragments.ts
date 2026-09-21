// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

interface FragmentState {
  items: HTMLElement[]; // in reveal order (see setupFragments) — not necessarily DOM order
  index: number; // count of revealed items; also the index of the next one to reveal
}

const state = new WeakMap<HTMLElement, FragmentState>();

function setCurrent(items: HTMLElement[], idx: number): void {
  items.forEach((el, i) => el.classList.toggle('current', i === idx));
}

/** Numeric data-order, or null if absent/not a finite number. */
function parseOrder(el: HTMLElement): number | null {
  const raw = el.dataset.order;
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Collects the direct children of every [data-reveal] container on a slide
 * as fragments. Reveal order defaults to DOM order, but an item can carry an
 * explicit numeric data-order to jump earlier/later without moving it in the
 * markup — e.g. data-order="0" on the last <li> reveals it first. Items
 * without data-order default to their own DOM index, so mixing explicit and
 * implicit ordering on the same list is well-defined (unordered items keep
 * their natural relative position; ordered ones are pulled to where their
 * number places them).
 */
export function setupFragments(slide: HTMLElement): void {
  const domItems = [...slide.querySelectorAll<HTMLElement>('[data-reveal] > *')];
  domItems.forEach((el) => el.classList.add('reveal-item'));

  const items = domItems
    .map((el, domIndex) => ({ el, order: parseOrder(el) ?? domIndex }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.el);

  state.set(slide, { items, index: 0 });
}

export function resetFragments(slide: HTMLElement): void {
  const s = state.get(slide);
  if (!s) return;
  s.items.forEach((el) => el.classList.remove('revealed', 'current'));
  s.index = 0;
}

/**
 * "current" always marks the most recently revealed fragment (until the
 * next one is revealed) — used by fragment variants like
 * fade-in-then-semi-out to dim earlier points while highlighting the one
 * just revealed.
 */
export function revealNextFragment(slide: HTMLElement): HTMLElement | null {
  const s = state.get(slide);
  if (!s || s.index >= s.items.length) return null;
  const el = s.items[s.index]!;
  el.classList.add('revealed');
  setCurrent(s.items, s.index);
  s.index++;
  return el;
}

export function hideLastFragment(slide: HTMLElement): boolean {
  const s = state.get(slide);
  if (!s || s.index <= 0) return false;
  s.index--;
  s.items[s.index]!.classList.remove('revealed');
  setCurrent(s.items, s.index - 1);
  return true;
}

/** -1 = no fragment revealed yet, matching the fragmentIndex convention used by revealFragmentsUpTo/goTo. */
export function getFragmentIndex(slide: HTMLElement): number {
  return (state.get(slide)?.index ?? 0) - 1;
}

/**
 * Jumps straight to a fragment step instead of revealing one at a time —
 * for deep-linking to "slide N, fragment M". fragmentIndex follows the same
 * convention as getFragmentIndex: -1 reveals nothing, 0 reveals just the
 * first fragment, etc. Out-of-range values clamp instead of throwing.
 */
export function revealFragmentsUpTo(slide: HTMLElement, fragmentIndex: number): void {
  const s = state.get(slide);
  if (!s) return;
  const target = Math.max(-1, Math.min(fragmentIndex, s.items.length - 1));
  s.items.forEach((el, i) => el.classList.toggle('revealed', i <= target));
  s.index = target + 1;
  setCurrent(s.items, target);
}
