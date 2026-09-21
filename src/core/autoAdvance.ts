// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

const RING_CIRC = 94.2;

export interface AutoAdvance {
  start(slide: HTMLElement): void;
  stop(): void;
}

/**
 * Timer ring for data-duration slides. start() reads the duration off the
 * given slide, stop() clears the timer/rAF and resets the ring — called
 * again on every slide change (see the deck controller).
 */
export function createAutoAdvance(
  timerRing: SVGSVGElement,
  timerFill: SVGCircleElement,
  onAdvance: () => void
): AutoAdvance {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let raf: number | null = null;

  function stop(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    timerRing.classList.remove('active');
    timerFill.style.strokeDashoffset = String(RING_CIRC);
  }

  function start(slide: HTMLElement): void {
    stop();
    const dur = parseInt(slide.dataset.duration ?? '0', 10);
    if (!dur) return;

    const startTime = performance.now();
    timerRing.classList.add('active');

    function tick(now: number): void {
      const elapsed = now - startTime;
      const frac = Math.min(elapsed / dur, 1);
      timerFill.style.strokeDashoffset = String(RING_CIRC * (1 - frac));
      if (frac < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    timer = setTimeout(onAdvance, dur);
  }

  return { start, stop };
}
