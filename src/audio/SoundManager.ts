// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { AudioLoader } from './AudioLoader';
import type { PlaybackOptions } from './types';

/** Fire-and-forget one-shot playback — each call gets its own source node, nothing to track or stop. */
export class SoundManager {
  constructor(private readonly context: AudioContext, private readonly loader: AudioLoader) {}

  play(name: string, options: PlaybackOptions = {}): void {
    const buffer = this.loader.get(name);
    if (!buffer) {
      console.warn(`SoundManager: sound "${name}" not loaded`);
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();

    source.buffer = buffer;
    source.loop = options.loop ?? false;
    source.playbackRate.value = options.playbackRate ?? 1;
    gain.gain.value = options.volume ?? 1;

    source.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }
}
