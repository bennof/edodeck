// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { AudioLoader } from './AudioLoader';
import { MusicManager } from './MusicManager';
import { SoundManager } from './SoundManager';
import type { AudioAsset } from './types';

/**
 * Facade over the Web Audio API: preload named assets once, then trigger
 * one-shot sound effects (.sfx) or crossfading background music (.music) by
 * name. Knows nothing about decks/slides/DOM structure — a standalone
 * primitive that any project can adopt independently of edodeck.
 */
export class AudioManager {
  private readonly context: AudioContext;
  private readonly loader: AudioLoader;
  readonly music: MusicManager;
  readonly sfx: SoundManager;

  constructor() {
    this.context = new AudioContext();
    this.loader = new AudioLoader(this.context);
    this.music = new MusicManager(this.context, this.loader);
    this.sfx = new SoundManager(this.context, this.loader);
  }

  preload(assets: AudioAsset[]): Promise<Map<string, AudioBuffer>> {
    return this.loader.preloadAll(assets);
  }

  load(asset: AudioAsset): Promise<AudioBuffer> {
    return this.loader.load(asset.name, asset.url);
  }

  /** Registers an already-decoded buffer directly (e.g. procedurally generated audio) instead of fetching one. */
  provide(name: string, buffer: AudioBuffer): void {
    this.loader.set(name, buffer);
  }

  /** Escape hatch for anything beyond this facade — inserting custom nodes, an AudioWorklet, an analyser, etc. */
  get audioContext(): AudioContext {
    return this.context;
  }

  /** Browsers suspend a freshly created AudioContext until a user gesture resumes it. */
  resume(): Promise<void> {
    return this.context.resume();
  }
}
