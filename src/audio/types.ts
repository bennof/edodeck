// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export interface AudioAsset {
  name: string;
  url: string;
}

export interface PlaybackOptions {
  loop?: boolean;
  volume?: number;
  playbackRate?: number;
}
