export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function overlap(a, b) { const x = Math.max(a.x, b.x); return { x, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x) }; }
export function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function circleRect(ball, rect) { const x = clamp(ball.x, rect.x, rect.x + rect.w); const y = clamp(ball.y, rect.y, rect.y + rect.h); return (ball.x-x)**2 + (ball.y-y)**2 <= ball.r**2; }
