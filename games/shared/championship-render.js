import { Renderer } from './sports/render.js';
import { CAMPAIGNS } from './championship.js';

const CARS = [[100,53,242,433],[544,57,243,425],[988,66,242,413],[1421,45,262,434],[107,572,228,239],[494,581,355,230],[1041,538,138,293],[1365,486,375,379]];
export class ChampionshipRenderer extends Renderer {
  constructor(canvas, kind, assets) { super(canvas, kind, assets.sports, assets.bike); this.assets = assets; }
  art(index, x, y, w, h) { this.ctx.drawImage(this.assets.rally, ...CARS[index], x, y, w, h); }
  backgroundArt(image, opacity = 1) { const c = this.ctx; c.save(); c.globalAlpha = opacity; c.drawImage(image, 0, 0, 420, 600); c.restore(); }
  hud(label, sub, progress, hearts) {
    const m = this.model;
    if (this.kind === 'triathlon-sprint') { label = `${m.stage.name.toUpperCase()}   ·   POSITION ${m.rank} / 5`; sub = `${Math.floor(m.distance)} / ${m.legLength} m   ·   ${m.time.toFixed(1)} s`; }
    if (this.kind === 'pocket-golf') { label = `HOLE ${m.hole - m.firstHole + 1} / 3   ·   ${m.course.name.toUpperCase()}`; sub = `PAR ${m.course.par}   ·   ${m.strokes} strokes   ·   CUP ${m.totalStrokes} / ${m.target}`; }
    this.box(12, 12, 396, 66, '#091526ed', 12);
    this.text(label, 26, 35, 13, '#f5faf7'); this.text(sub, 26, 56, 12, '#c3cbd6', 'left', 400);
    if (hearts !== undefined) this.text('♥'.repeat(Math.max(0, hearts)), 395, 57, 15, '#ffa88b', 'right');
    this.box(26, 66, 368, 3, '#465265', 1); this.box(26, 66, Math.max(2, 368 * Math.min(1, progress)), 3, CAMPAIGNS[this.kind].accent, 1);
  }
  draw(m, aim) {
    this.model = m; const c = this.ctx; c.save(); c.clearRect(0, 0, 420, 600);
    if (this.kind === 'neon-rally') this.rally(m);
    else if (this.kind === 'orbit-breaker') this.breaker(m);
    else if (this.kind === 'stack-circuit') this.stack(m);
    else if (this.kind === 'triathlon-sprint') this.triathlon(m);
    else if (this.kind === 'bike-rider') this.bike(m);
    else this.golf(m, aim);
    for (const p of m.particles || []) { c.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); this.circle(p.x, p.y, 2.5, p.color); } c.globalAlpha = 1;
    if (m.flash > 0) { c.fillStyle = `rgba(255,110,90,${m.flash})`; c.fillRect(0, 0, 420, 600); }
    if (m.noticeTimer > 0 && this.kind !== 'pocket-golf') {
      this.box(30, 87, 360, 35, '#091526ec', 8); this.text(m.notice, 210, 109, m.notice.length > 39 ? 11 : 13, '#efffb6', 'center');
    }
    c.restore();
  }
  rally(m) {
    const c = this.ctx;
    c.fillStyle = ['#17343a','#674f4d','#211d40','#21172f'][m.level]; c.fillRect(0, 0, 420, 600);
    for (let y = -8; y < 610; y += 8) {
      const center = m.center(y), pulse = Math.floor((m.scroll - y) / 38) % 2;
      c.fillStyle = pulse ? '#f0b8a1' : '#cc4c62'; c.fillRect(center - 158, y, 316, 9);
      c.fillStyle = '#252d40'; c.fillRect(center - 150, y, 300, 9);
      c.fillStyle = '#93eeff'; c.fillRect(center - 147, y, 2, 9); c.fillRect(center + 145, y, 2, 9);
      if (Math.floor((m.scroll - y) / 46) % 2) { c.fillStyle = '#8b92ae77'; c.fillRect(center - 47, y, 2, 9); c.fillRect(center + 47, y, 2, 9); }
    }
    for (let y = -150; y < 720; y += 230) { const yy = y + m.scroll % 230; this.art(7, m.center(yy) - 248, yy, 99, 100); this.art(7, m.center(yy) + 157, yy - 80, 99, 100); }
    for (const o of m.objects) {
      if (o.hit && o.kind !== 'car') continue;
      if (o.kind === 'car') { this.art(o.sprite, o.x - 25, o.y - 45, 50, 90); if (o.shift && o.age > 1 && o.age < 2.9 && Math.floor(m.time * 8) % 2) this.circle(o.x + Math.sign(o.shift) * 21, o.y + 25, 4, '#ffc870'); }
      else if (o.kind === 'nitro') { this.circle(o.x, o.y, 25, '#71f1ff22'); this.art(6, o.x - 13, o.y - 28, 26, 56); }
      else this.art(5, o.x - 37, o.y - 22, 74, 44);
    }
    c.save(); c.translate(m.x, 492); c.rotate(m.vx / 2200);
    if (m.invincible && Math.floor(m.time * 12) % 2) c.globalAlpha = 0.45;
    if (m.boosting) { c.fillStyle = '#89ecff'; c.beginPath(); c.moveTo(-12,37); c.lineTo(0,76 + Math.sin(m.time * 45) * 9); c.lineTo(12,37); c.fill(); }
    this.art(0, -25, -45, 50, 90); c.restore();
    this.hud(CAMPAIGNS[this.kind].stages[m.level].toUpperCase(), `CHECKPOINT ${m.checkpoint} / 4   ·   ${Math.max(0, m.remaining).toFixed(1)} s`, m.progress, m.hearts);
    this.box(35, 558, 350, 30, '#091526ef', 10); this.text(`${Math.round(m.speed / 2.4)} km/h`, 48, 578, 12);
    this.text(m.offroad ? 'OFF ROAD' : 'NITRO', 163, 578, 10, '#adceda'); this.box(230, 569, 138, 9, '#3d495d', 4); this.box(230, 569, Math.max(2, m.energy * 1.38), 9, '#68e8ff', 4);
  }
  breaker(m) {
    const c = this.ctx; this.backgroundArt(this.assets.orbit); c.fillStyle = '#060e2070'; c.fillRect(0, 0, 420, 600);
    for (const b of m.bricks) if (b.live) {
      const color = b.explosive ? '#ff936b' : b.hp > 2 ? '#c092ef' : b.hp > 1 ? '#67b9f5' : '#8de8cc';
      this.box(b.x, b.y + 3, b.w, b.h, '#04172a', 4); this.box(b.x, b.y, b.w, b.h, color, 4);
      c.fillStyle = '#ffffff65'; c.fillRect(b.x + 4, b.y + 2, b.w - 8, 2); c.fillStyle = '#16344766'; c.fillRect(b.x + 3, b.y + b.h - 5, b.w - 6, 3);
      if (b.explosive) this.text('✦', b.x + b.w / 2, b.y + 17, 17, '#5c272c', 'center');
      else for (let i = 0; i < b.hp - 1; i++) this.box(b.x + 19 + i * 8 - (b.hp - 2) * 4, b.y + 9, 5, 5, '#1c3655', 1);
    }
    if (m.shield) { c.shadowColor = '#8debff'; c.shadowBlur = 14; this.box(10, 584, 400, 4, '#86ecff', 1); c.shadowBlur = 0; this.text(`${m.shield} SHIELD`, 210, 578, 10, '#bfeeff', 'center'); }
    const p = m.paddle;
    c.shadowColor = '#99f5d6'; c.shadowBlur = 16; this.box(p.x, p.y, p.w, p.h, '#ccffe8', 6); c.shadowBlur = 0;
    this.box(p.x + 5, p.y + 3, 9, 9, '#5194bf', 3); this.box(p.x + p.w - 14, p.y + 3, 9, 9, '#5194bf', 3);
    for (const b of m.balls) { b.trail.forEach((point, i) => this.circle(point.x, point.y, 1 + i * .5, `rgba(186,231,255,${i / 22})`)); this.circle(b.x, b.y, b.r + 3, '#bef5ff22'); this.circle(b.x, b.y, b.r, '#fff6d9'); }
    for (const d of m.drops) { this.box(d.x - 15, d.y - 12, 30, 24, '#f7dca1', 10); this.text(d.type, d.x, d.y + 5, 14, '#162c3c', 'center', 800); }
    this.hud(CAMPAIGNS[this.kind].stages[m.level].toUpperCase(), `${m.broken} / ${m.initial} TARGETS   ·   ${Math.floor(m.time)} s`, m.progress, m.hearts);
    if (m.waiting) { this.box(60, 382, 300, 64, '#081629ec', 12); this.text('SET YOUR ANGLE', 210, 408, 16, '#b7ffe0', 'center'); this.text('Move the paddle, then press Launch', 210, 430, 12, '#c1cdd9', 'center', 400); }
    if (m.wide) this.text(`WIDE  ${Math.ceil(m.wide)} s`, 210, 516, 11, '#bcffdf', 'center');
  }
  block(x, y, w, color) {
    const c = this.ctx; this.box(x, y, w, 25, color, 3); c.fillStyle = '#ffffff50'; c.fillRect(x + 2, y + 2, Math.max(0, w - 4), 3); c.fillStyle = '#18244955'; c.fillRect(x + 2, y + 19, Math.max(0, w - 4), 5);
    if (w > 35) { c.fillStyle = '#17243d40'; for (let xx = x + 14; xx < x + w - 7; xx += 20) c.fillRect(xx, y + 9, 5, 5); }
  }
  stack(m) {
    const c = this.ctx; this.backgroundArt(this.assets.stack); c.fillStyle = '#10193255'; c.fillRect(0, 0, 420, 600);
    c.save(); c.translate(0, m.camera);
    m.blocks.forEach((b, i) => this.block(b.x, 544 - i * 25, b.w, `hsl(${155 + i * 8},65%,${59 + i % 2 * 7}%)`));
    for (const p of m.fragments) { c.save(); c.translate(p.x + p.w / 2, p.y + 12); c.rotate(p.angle); this.block(-p.w / 2, -12, p.w, '#ee9f9e'); c.restore(); }
    if (!m.done && m.phase !== 'settle') {
      const y = m.phase === 'fall' ? m.dropY : m.top - 117;
      if (m.focus) { const last = m.blocks[m.blocks.length - 1]; c.strokeStyle = '#e9ffc880'; c.lineWidth = 1; c.setLineDash([5, 5]); c.strokeRect(last.x, y, last.w, m.top - y); c.setLineDash([]); }
      this.block(m.current.x, y, m.current.w, '#f0ff9e');
    }
    c.restore();
    this.hud(CAMPAIGNS[this.kind].stages[m.level].toUpperCase(), `FLOOR ${m.blocks.length - 1} / ${m.goal}   ·   ${m.perfects} PERFECT`, m.progress);
    if (m.level) this.text(`${m.wind < 0 ? '←' : '→'}  WIND ${Math.abs(Math.round(m.wind || 0))}`, 390, 145, 11, '#cfe9f3', 'right');
    this.box(45, 558, 330, 30, '#091526ed', 10); this.text(m.focus ? 'FOCUS ACTIVE' : 'FOCUS', 59, 578, 10, '#eeffba'); this.box(166, 569, 193, 8, '#455065', 4); this.box(166, 569, Math.max(2, m.energy * 1.93), 8, '#e4fe7e', 4);
  }
}
