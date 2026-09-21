// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { stringsFor } from '../strings';
import { qrSvg } from './qr';

function videoUrl(id: string): string {
  return `https://youtu.be/${id}`;
}

/**
 * Videos aren't playable in print (see @media print). Instead of an empty
 * area, every YouTube embed gets a print-only QR code layer linking to the
 * video URL — invisible at runtime (see .yt-print-qr in
 * youtube.css/print.css). The QR code is a plain vector SVG (see qr.ts, no CSS
 * background-image), so it prints reliably even without "print background
 * graphics" enabled.
 */
export function setupYoutubePrintQr(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('.yt-embed[data-yt]').forEach((el) => {
    const id = el.dataset.yt;
    if (!id) return;
    const url = videoUrl(id);

    const layer = document.createElement('div');
    layer.className = 'yt-print-qr';

    const svg = qrSvg(url);
    if (svg) {
      const qrCode = document.createElement('div');
      qrCode.className = 'yt-print-qr-code';
      qrCode.innerHTML = svg;
      layer.appendChild(qrCode);
    }

    const caption = document.createElement('span');
    caption.className = 'yt-print-caption';
    caption.textContent = `${stringsFor(el).watchVideo}: ${url}`;
    layer.appendChild(caption);

    el.appendChild(layer);
  });
}
