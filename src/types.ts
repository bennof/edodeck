// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export interface MountDefinition {
  mount(el: HTMLElement): void;
  unmount(el: HTMLElement): void;
}
