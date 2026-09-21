// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

// The deck's own texts, English and German. The language follows the closest
// [lang] attribute above the element in question (e.g. <html lang="de">);
// German for de and de-…, English for everything else, including no lang.

export interface Strings {
  // FAB menu and drawing toolbar (aria labels)
  eraser: string;
  clearAll: string;
  openMenu: string;
  prev: string;
  next: string;
  fullscreen: string;
  notes: string;
  annotate: string;
  print: string;
  // notes panel
  notesEmpty: string;
  // printed QR code caption for video embeds
  watchVideo: string;
}

const EN: Strings = {
  eraser: 'Eraser',
  clearAll: 'Clear all',
  openMenu: 'Open menu',
  prev: 'Previous slide',
  next: 'Next slide / next item',
  fullscreen: 'Toggle fullscreen',
  notes: 'Toggle notes',
  annotate: 'Toggle drawing surface',
  print: 'Print as PDF',
  notesEmpty: '(no notes)',
  watchVideo: 'Watch video',
};

const DE: Strings = {
  eraser: 'Radierer',
  clearAll: 'Alles löschen',
  openMenu: 'Menü öffnen',
  prev: 'Vorherige Folie',
  next: 'Nächste Folie / nächstes Element',
  fullscreen: 'Vollbild umschalten',
  notes: 'Notizen umschalten',
  annotate: 'Zeichenfläche umschalten',
  print: 'Als PDF drucken',
  notesEmpty: '(keine Notizen)',
  watchVideo: 'Video ansehen',
};

export function stringsFor(el: Element): Strings {
  const lang = el.closest('[lang]')?.getAttribute('lang')?.trim() ?? '';
  return /^de(?:-|$)/i.test(lang) ? DE : EN;
}
