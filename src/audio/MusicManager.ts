// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { AudioLoader } from './AudioLoader';

/** Looping background track with a linear crossfade between whatever's playing and the next track. */
export class MusicManager {
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;

  constructor(private readonly context: AudioContext, private readonly loader: AudioLoader) {}

  play(name: string, fadeDuration = 2, volume = 1): void {
    const buffer = this.loader.get(name);
    if (!buffer) {
      console.warn(`MusicManager: track "${name}" not loaded`);
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.connect(this.context.destination);
    source.connect(gain);
    source.start();

    // Fade the outgoing track out and the incoming one in over the same
    // window, then stop the outgoing source once it's silent.
    if (this.currentGain) {
      this.currentGain.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeDuration);
    }
    gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + fadeDuration);
    this.currentSource?.stop(this.context.currentTime + fadeDuration);

    this.currentSource = source;
    this.currentGain = gain;
  }

  stop(fadeDuration = 2): void {
    if (!this.currentGain || !this.currentSource) return;
    this.currentGain.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeDuration);
    this.currentSource.stop(this.context.currentTime + fadeDuration);
    this.currentSource = null;
    this.currentGain = null;
  }
}
