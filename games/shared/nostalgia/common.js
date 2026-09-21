export const W = 384, H = 288;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const wrap = (v, size) => (v % size + size) % size;
export const delta = (a, b, size) => wrap(a - b + size / 2, size) - size / 2;
export class Random {
  constructor(seed = 1983) { this.seed = seed >>> 0; }
  next() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
}
export function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function approach(value, target, speed) { return value + clamp(target - value, -speed, speed); }
export function timeText(seconds) { const n = Math.max(0, Math.ceil(seconds)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; }
