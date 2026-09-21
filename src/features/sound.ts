// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { AudioManager } from '../audio';
import type { AudioAsset } from '../audio';

export interface SoundOptions {
  /** Preloaded once at setup; play() calls before loading finishes are dropped with a console warning. */
  assets?: AudioAsset[];
}

export interface SoundController {
  audio: AudioManager;
  /** data-music on a slide crossfades to that track when the slide becomes active; slides without it leave the current track playing. */
  onSlideChange(index: number, slide: HTMLElement): void;
  /** data-sound on a fragment plays that effect the moment it's revealed via advance() (not on deep-link jumps). */
  onFragmentReveal(el: HTMLElement): void;
}

/**
 * Thin bridge between the standalone src/audio/ library and edodeck's deck
 * lifecycle (DeckHooks). Deliberately lives outside src/audio/ so that mini-
 * lib stays deck-agnostic and independently reusable — this file is the only
 * part that knows about slides, fragments, and data attributes.
 */
export function setupSound(options: SoundOptions = {}): SoundController {
  const audio = new AudioManager();

  // setActive(0) fires onSlideChange synchronously while createDeck() is
  // still running, before preload() (a real fetch) can possibly have
  // resolved — gate the first play attempts on it so data-music on the
  // opening slide doesn't silently lose the race and warn "not loaded".
  const ready = options.assets?.length
    ? audio.preload(options.assets).catch((err) => {
        console.error('edodeck: audio preload failed', err);
      })
    : Promise.resolve();

  // Browsers suspend a fresh AudioContext until a user gesture resumes it —
  // unlock on the first interaction anywhere on the page, same pattern
  // already used for muted YouTube autoplay.
  const unlock = (): void => {
    audio.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  return {
    audio,
    onSlideChange(_index, slide) {
      const track = slide.dataset.music;
      if (track) ready.then(() => audio.music.play(track));
    },
    onFragmentReveal(el) {
      const sound = el.dataset.sound;
      if (sound) ready.then(() => audio.sfx.play(sound));
    },
  };
}
