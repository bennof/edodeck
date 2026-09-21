// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

const STORAGE_KEY = 'slidedeck_annotations_v1';
const PEN_WIDTH = 5;
const ERASER_WIDTH = 34;
const LAZY_RADIUS = 14; // canvas units, relative to the design canvas

interface Point {
  x: number;
  y: number;
}

/**
 * Freehand drawing layer over the current slide. Drawing runs on Pointer
 * Events (touch-friendly). Smoothing: lazy-brush stabilization (the drawn
 * point "lags" behind the pointer until LAZY_RADIUS is exceeded) +
 * quadratic-midpoint smoothing against jagged lines. Persisted per slide via
 * localStorage — may not work in sandboxed previews (e.g. chat previews);
 * try/catch there only prevents a hard crash.
 */
export class AnnotationLayer {
  private readonly ctx: CanvasRenderingContext2D;
  private active = false;
  private drawing = false;
  private color = '#ff5c5c';
  private erasing = false;
  private brush: Point | null = null;
  private lastMid: Point | null = null;
  private store: Record<number, string> = {};

  constructor(private readonly canvas: HTMLCanvasElement, private readonly stage: HTMLElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('AnnotationLayer: 2d context unavailable');
    this.ctx = ctx;
    this.loadStore();
    this.bindPointerEvents();
  }

  resize(size: { w: number; h: number }): void {
    this.canvas.width = size.w;
    this.canvas.height = size.h;
  }

  setActive(on: boolean): void {
    this.active = on;
    this.stage.classList.toggle('annotate-mode', on);
  }

  isActive(): boolean {
    return this.active;
  }

  setColor(color: string): void {
    this.color = color;
    this.erasing = false;
  }

  setErasing(on: boolean): void {
    this.erasing = on;
  }

  isErasing(): boolean {
    return this.erasing;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  saveCurrent(index: number): void {
    this.store[index] = this.canvas.toDataURL('image/png');
    this.persistStore();
  }

  getDataUrl(index: number): string | undefined {
    return this.store[index];
  }

  restore(index: number): void {
    const dataUrl = this.store[index];
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    img.src = dataUrl;
  }

  private point(e: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private bindPointerEvents(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.drawing = true;
      this.canvas.setPointerCapture(e.pointerId);
      const p = this.point(e);
      this.brush = { ...p };
      this.lastMid = { ...p };
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.active || !this.drawing || !this.brush || !this.lastMid) return;
      const p = this.point(e);

      const dx = p.x - this.brush.x;
      const dy = p.y - this.brush.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= LAZY_RADIUS) return;

      const t = (dist - LAZY_RADIUS) / dist;
      this.brush.x += dx * t;
      this.brush.y += dy * t;

      const mid = { x: (this.lastMid.x + this.brush.x) / 2, y: (this.lastMid.y + this.brush.y) / 2 };

      const ctx = this.ctx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = this.erasing ? 'destination-out' : 'source-over';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.erasing ? ERASER_WIDTH : PEN_WIDTH;
      ctx.beginPath();
      ctx.moveTo(this.lastMid.x, this.lastMid.y);
      ctx.quadraticCurveTo(this.brush.x, this.brush.y, mid.x, mid.y);
      ctx.stroke();

      this.lastMid = mid;
    });

    const stop = (): void => {
      this.drawing = false;
      this.brush = null;
      this.lastMid = null;
    };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
    this.canvas.addEventListener('pointerleave', stop);
  }

  private loadStore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.store = raw ? JSON.parse(raw) : {};
    } catch {
      this.store = {};
    }
  }

  private persistStore(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch {
      // Storage blocked/full — the running session stays usable without persistence
    }
  }
}
