// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { AudioAsset } from './types';

/** Fetches and decodes audio files into an AudioContext's native buffer format, keyed by name. */
export class AudioLoader {
  private readonly buffers = new Map<string, AudioBuffer>();

  constructor(private readonly context: AudioContext) {}

  async preloadAll(assets: AudioAsset[]): Promise<Map<string, AudioBuffer>> {
    for (const { name, url } of assets) {
      if (this.buffers.has(name)) {
        console.warn(`AudioLoader: skipping duplicate preload "${name}"`);
        continue;
      }
      this.buffers.set(name, await this.fetchAndDecode(url));
    }
    return this.buffers;
  }

  async load(name: string, url: string): Promise<AudioBuffer> {
    const existing = this.buffers.get(name);
    if (existing) return existing;
    const buffer = await this.fetchAndDecode(url);
    this.buffers.set(name, buffer);
    return buffer;
  }

  /** Registers an already-decoded buffer directly — for procedurally generated or otherwise not-fetched-from-a-URL audio. */
  set(name: string, buffer: AudioBuffer): void {
    this.buffers.set(name, buffer);
  }

  get(name: string): AudioBuffer | undefined {
    return this.buffers.get(name);
  }

  getAll(): Map<string, AudioBuffer> {
    return this.buffers;
  }

  private async fetchAndDecode(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.context.decodeAudioData(arrayBuffer);
  }
}
