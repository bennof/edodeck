// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export interface FabMenuActions {
  prev(): void;
  next(): void;
  fullscreen(): void;
  notes(): void;
  annotate(): void;
  print(): void;
}

export interface FabMenu {
  close(): void;
  isOpen(): boolean;
  setActionActive(action: string, on: boolean): void;
}

/**
 * A child of the stage (not the browser window) — stays correctly
 * positioned even with letterboxing. Deliberately stays open across slide
 * changes; it isn't tied to any single slide.
 */
export function setupFabMenu(root: ParentNode, actions: FabMenuActions): FabMenu {
  const menu = root.querySelector<HTMLElement>('#fab-menu');
  const toggle = root.querySelector<HTMLElement>('#fab-toggle');
  if (!menu || !toggle) throw new Error('setupFabMenu: #fab-menu / #fab-toggle not found');

  toggle.addEventListener('click', () => menu.classList.toggle('open'));

  menu.querySelectorAll<HTMLElement>('#fab-items .fab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.action) {
        case 'prev':
          actions.prev();
          break;
        case 'next':
          actions.next();
          break;
        case 'fullscreen':
          actions.fullscreen();
          break;
        case 'notes':
          actions.notes();
          break;
        case 'annotate':
          actions.annotate();
          break;
        case 'print':
          actions.print();
          break;
      }
    });
  });

  return {
    close: () => menu.classList.remove('open'),
    isOpen: () => menu.classList.contains('open'),
    setActionActive: (action, on) => {
      menu.querySelector<HTMLElement>(`#fab-items [data-action="${action}"]`)?.classList.toggle('active', on);
    },
  };
}
