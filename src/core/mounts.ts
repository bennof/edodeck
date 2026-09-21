// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { MountDefinition } from '../types';

/**
 * Registry for dynamic elements (canvas animations, future Three.js/CAS
 * elements, ...). Consumers register under their data-script-id; the deck
 * controller calls mount()/unmount() as the owning slide becomes
 * active/inactive.
 */
const registry = new Map<string, MountDefinition>();

export function registerMount(id: string, def: MountDefinition): void {
  registry.set(id, def);
}

const mountedSlides = new Set<number>();

/**
 * Supports multiple [data-mount] elements per slide (querySelectorAll
 * instead of querySelector) — fixes the single-dynamic-element-per-slide
 * limitation known from the prototype.
 */
export function handleMounts(slides: HTMLElement[], activeIndex: number): void {
  slides.forEach((slide, i) => {
    const isActive = i === activeIndex;
    const wasActive = mountedSlides.has(i);
    if (isActive === wasActive) return;

    slide.querySelectorAll<HTMLElement>('[data-mount]').forEach((mountEl) => {
      const def = registry.get(mountEl.dataset.scriptId ?? '');
      if (!def) return;
      if (isActive) def.mount(mountEl);
      else def.unmount(mountEl);
    });

    if (isActive) mountedSlides.add(i);
    else mountedSlides.delete(i);
  });
}
