// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { stringsFor } from '../strings';

export interface NotesPanel {
  update(slide: HTMLElement): void;
  toggle(): boolean;
}

export function createNotesPanel(panelEl: HTMLElement): NotesPanel {
  const label = document.createElement('b');
  label.textContent = 'Speaker Notes';
  const body = document.createElement('span');
  panelEl.append(label, body);

  let visible = false;

  return {
    update(slide: HTMLElement): void {
      body.textContent = slide.dataset.notes || stringsFor(panelEl).notesEmpty;
    },
    toggle(): boolean {
      visible = !visible;
      panelEl.classList.toggle('visible', visible);
      return visible;
    },
  };
}
