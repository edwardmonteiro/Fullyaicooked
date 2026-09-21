import { clamp, circleRect, overlap } from './physics.js';
import { Golf, COURSES, terrainHeight, LEGS } from './sports/models.js';

export const CAMPAIGNS = {
  'neon-rally': { title: 'Neon Rally', accent: '#68e8ff', stages: ['Harbor Run', 'Canyon Circuit', 'Night Shift', 'Neon Grand Prix'], controls: 'Steer through traffic. Brake into bends. Spend nitro on clear straights. Reach each checkpoint before time runs out.', hint: '← → steer · Space nitro · ↓ brake', actions: [['left','←'],['brake','Brake'],['pace','Nitro'],['right','→']] },
  'orbit-breaker': { title: 'Orbit Breaker', accent: '#91f1ca', stages: ['First Contact', 'Armored Belt', 'Chain Reaction', 'The Reactor', 'Orbital Core'], controls: 'Angle the ball with the paddle edges. Crack armored bricks and catch W (wide), M (multiball), and S (shield) capsules.', hint: 'Drag or ← → move · Space launch', actions: [['left','←'],['action','Launch'],['right','→']] },
  'stack-circuit': { title: 'Stack Circuit', accent: '#e4fe7e', stages: ['Foundation', 'Crosswind', 'Skyline', 'The Spire'], controls: 'Drop each block onto the tower. Perfect drops rebuild lost width. Hold Focus to slow time; its charge is limited.', hint: 'Space drop · Hold ↓ for Focus', actions: [['focus','Hold focus'],['action','Drop block']] },
  'triathlon-sprint': { title: 'Triathlon Sprint', accent: '#78e6e0', stages: ['Coastal Cup', 'City Championship', 'Endurance Final'], controls: 'Race four opponents through swimming, cycling, and running. Draft behind them to save stamina. Finish in the top three to advance.', hint: 'Drag or ← → steer · Space pace · Slipstream saves stamina', actions: [['left','←'],['pace','Hold pace'],['right','→']] },
  'bike-rider': { title: 'Bike Rider', accent: '#ffbb8e', stages: ['Alpine Roots', 'Canyon Gaps', 'Summit Trial'], controls: 'Pedal, jump, and lean in the air. Match your wheels to the slope on landing. Clear gaps and reach checkpoints to save your position.', hint: 'Space jump · ↑ pedal · ← → lean · Land with level wheels', actions: [['left','Lean ↶'],['action','Jump'],['pedal','Pedal'],['right','Lean ↷']] },
  'pocket-golf': { title: 'Pocket Golf', accent: '#b9f2ad', stages: ['Garden Cup', 'Waterfront Cup', 'Clockwork Cup'], controls: 'Pull back anywhere, then release to putt. Follow the dotted guide. Each cup has three holes; finish within the stroke target to advance.', hint: 'Drag to putt · ← → aim · ↑ ↓ power · Space putt', actions: [['left','↶'],['action','Putt'],['right','↷']] }
};
export function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
export class Round {
  constructor(level = 0) { this.level = level; this.time = 0; this.score = 0; this.done = false; this.won = false; this.medal = 0; this.events = []; this.notice = ''; this.noticeTimer = 0; this.particles = []; this.flash = 0; }
  emit(type) { this.events.push(type); }
  say(text, seconds = 1.7) { this.notice = text; this.noticeTimer = seconds; }
  updateEffects(dt) { this.time += dt; this.noticeTimer = Math.max(0, this.noticeTimer - dt); this.flash = Math.max(0, this.flash - dt); for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.life -= dt; } this.particles = this.particles.filter(p => p.life > 0); }
  burst(x, y, color, count = 12) { for (let i = 0; i < count; i++) this.particles.push({ x, y, vx: Math.sin(i * 2.4) * (40 + i * 7), vy: Math.cos(i * 2.4) * 100, life: 0.5 + i % 3 * 0.1, color }); }
  finish(won, message, medal = 1) { if (this.done) return; this.done = true; this.won = won; this.medal = won ? medal : 0; this.message = message; this.emit(won ? 'win' : 'end'); }
}

export class Rally extends Round {
  constructor(level = 0) {
    super(level); this.random = seeded(302 + level); this.x = 210; this.vx = 0; this.speed = 0; this.scroll = 0; this.distance = 0;
    this.length = [1050, 1400, 1750, 2100][level]; this.remaining = 21; this.checkpoint = 1; this.energy = 75;
    this.hearts = 4; this.crashes = 0; this.near = 0; this.combo = 0; this.comboTime = 0; this.invincible = 0; this.spawn = 1.8; this.objects = []; this.spawnIndex = 0;
  }
  get progress() { return clamp(this.distance / this.length, 0, 1); }
  center(y) { return 210 + Math.sin((this.scroll + 500 - y) / (620 - this.level * 60)) * (22 + this.level * 9) + Math.sin((this.scroll + 500 - y) / 270) * (this.level * 4); }
  tick(dt, input = {}) {
    if (this.done) return; this.updateEffects(dt); this.remaining -= dt; this.invincible = Math.max(0, this.invincible - dt); this.comboTime -= dt;
    if (this.comboTime <= 0) this.combo = 0;
    const center = this.center(492); this.offroad = Math.abs(this.x - center) > 126;
    this.boosting = !!input.pace && this.energy > 1 && !input.brake && !this.offroad;
    this.energy = clamp(this.energy + (this.boosting ? -34 : 4) * dt, 0, 100);
    const target = (270 + this.level * 27) * (input.brake ? 0.53 : this.boosting ? 1.55 : 1) * (this.offroad ? 0.57 : 1);
    this.speed += clamp(target - this.speed, -600 * dt, 235 * dt);
    let steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (Number.isFinite(input.targetX)) steer = clamp((input.targetX - this.x) / 38, -1, 1);
    this.vx += (steer * (input.brake ? 235 : 315) - this.vx) * Math.min(1, dt * 12);
    this.x = clamp(this.x + this.vx * dt, 23, 397); this.scroll += this.speed * dt; this.distance += this.speed * dt * 0.09;
    this.spawn -= dt;
    if (this.spawn <= 0) {
      const lane = Math.floor(this.random() * 3) - 1, index = this.spawnIndex++;
      const type = index % 7 === 4 ? 'nitro' : index % 11 === 8 && this.level ? 'oil' : 'car';
      this.objects.push({ lane, offset: lane * 88, y: -90, kind: type, sprite: 1 + index % 3, shift: this.level > 1 && index % 4 === 0 ? -lane * 60 : 0, age: 0, hit: false, passed: false });
      this.spawn = Math.max(0.67, 1.25 - this.level * 0.12) + this.random() * 0.25;
    }
    for (const o of this.objects) {
      o.age += dt; o.y += (this.speed - (o.kind === 'car' ? 80 + this.level * 4 : 0)) * dt;
      o.x = this.center(o.y) + o.offset + (o.age > 1.8 ? o.shift * Math.min(1, (o.age - 1.8) / 1.1) : 0);
      const dx = Math.abs(o.x - this.x), dy = Math.abs(o.y - 492);
      if (!o.hit && dx < (o.kind === 'car' ? 39 : 28) && dy < (o.kind === 'car' ? 69 : 34)) {
        o.hit = true;
        if (o.kind === 'nitro') { this.energy = Math.min(100, this.energy + 45); this.score += 150; this.say('NITRO +45'); this.emit('coin'); this.burst(o.x, o.y, '#76f3ff'); }
        else if (o.kind === 'oil') { this.vx += o.lane > 0 ? -180 : 180; this.speed *= 0.65; this.say('OIL · Ease off the throttle'); }
        else if (!this.invincible) {
          this.hearts--; this.crashes++; this.invincible = 1.3; this.speed *= 0.5; this.combo = 0; this.flash = 0.18; this.emit('hit'); this.burst(this.x, 492, '#ff936f', 22);
          if (!this.hearts) this.finish(false, `Car retired at ${Math.floor(this.progress * 100)}%. Brake before tight traffic.`);
        }
      }
      if (!o.passed && o.y > 570 && o.kind === 'car') { o.passed = true; if (!o.hit) { this.score += 80; if (dx < 68) { this.combo++; this.comboTime = 5; this.near++; this.score += this.combo * 100; this.energy = Math.min(100, this.energy + 9); this.say(`CLOSE CALL ×${this.combo}`); this.emit('coin'); } } }
    }
    this.objects = this.objects.filter(o => o.y < 720);
    if (this.checkpoint < 4 && this.distance >= this.length * this.checkpoint / 4) { this.checkpoint++; this.remaining += 17 + this.level * 2; this.score += 300; this.say('CHECKPOINT · TIME EXTENDED', 2); this.emit('stage'); }
    if (this.progress >= 1) { this.score += Math.round(this.remaining * 30) + this.hearts * 250; this.finish(true, `${this.time.toFixed(1)} s · ${this.near} close calls · ${this.crashes} collisions.`, this.crashes === 0 ? 3 : this.crashes === 1 ? 2 : 1); }
    else if (this.remaining <= 0) this.finish(false, 'Time ran out. Use nitro on open road and reach the next checkpoint.');
  }
}

const BOARDS = [
  ['0011100','0111110','1111111','0101010'],
  ['2222222','1100011','1122211','0100010','0111110'],
  ['11E1E11','1212121','1E111E1','0022200','0111110'],
  ['0333330','12E2E21','1100011','0222220','1010101','0111110'],
  ['33E3E33','2121212','1E222E1','2020202','1122211','0111110']
];
export class Breaker extends Round {
  constructor(level = 0) {
    super(level); this.paddle = { x: 156, y: 538, w: 108, h: 15 }; this.hearts = 3; this.waiting = true; this.balls = []; this.bricks = []; this.drops = [];
    this.wide = 0; this.shield = 0; this.chain = 0; this.broken = 0; this.hits = 0; this.launched = 0; this.powerIndex = 0;
    BOARDS[level].forEach((row, y) => [...row].forEach((value, x) => { if (value !== '0') this.bricks.push({ x: 20 + x * 55, y: 102 + y * 31, w: 49, h: 23, hp: value === 'E' ? 1 : Number(value), max: value === 'E' ? 1 : Number(value), explosive: value === 'E', live: true }); }));
    this.initial = this.bricks.length; this.resetBall();
  }
  get progress() { return this.broken / this.initial; }
  get ball() { return this.balls[0]; }
  resetBall() { this.balls = [{ x: this.paddle.x + this.paddle.w / 2, y: 526, r: 7, vx: 120, vy: -(310 + this.level * 30), trail: [] }]; this.waiting = true; this.chain = 0; }
  action() { if (this.waiting) { this.waiting = false; this.launched++; this.emit('putt'); } }
  damage(brick, blast = false) {
    if (!brick.live) return; brick.hp--; this.hits++;
    this.burst(brick.x + 24, brick.y + 12, brick.explosive ? '#ff906b' : '#8de9f1', brick.hp ? 5 : 12); this.emit('brick');
    if (brick.hp > 0) { this.score += 15; return; }
    brick.live = false; this.broken++; this.chain++; this.score += 50 + Math.min(6, this.chain) * 10;
    if (brick.explosive && !blast) { this.say('CHAIN REACTION'); for (const other of this.bricks) if (other.live && Math.hypot(other.x - brick.x, other.y - brick.y) < 86) this.damage(other, true); }
    if (this.broken % 6 === 0 && !blast) { this.drops.push({ x: brick.x + 24, y: brick.y, type: ['W','M','S'][this.powerIndex++ % 3] }); }
  }
  power(type) {
    if (type === 'W') { this.wide = 13; this.say('WIDE PADDLE · 13 seconds'); }
    if (type === 'S') { this.shield = 2; this.say('SHIELD · 2 saves'); }
    if (type === 'M' && this.balls.length < 5) {
      const source = this.balls[0]; if (source) for (const side of [-1, 1]) this.balls.push({ ...source, vx: side * 240, vy: -Math.max(240, Math.abs(source.vy)), trail: [] });
      this.say('MULTIBALL');
    }
    this.emit('coin');
  }
  tick(dt, input = {}) {
    if (this.done) return; this.updateEffects(dt); this.wide = Math.max(0, this.wide - dt);
    const center = this.paddle.x + this.paddle.w / 2; this.paddle.w = this.wide > 0 ? 155 : 108 - this.level * 4;
    let x = center + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * dt * 450;
    if (Number.isFinite(input.targetX)) x = input.targetX;
    this.paddle.x = clamp(x - this.paddle.w / 2, 10, 410 - this.paddle.w);
    if (input.action) this.action();
    if (this.waiting) { this.ball.x = this.paddle.x + this.paddle.w / 2; this.ball.y = 526; return; }
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    for (let step = 0; step < steps; step++) {
      const h = dt / steps;
      for (const b of this.balls) {
        const px = b.x, py = b.y; b.x += b.vx * h; b.y += b.vy * h;
        if (b.x < 12) { b.x = 12; b.vx = Math.abs(b.vx); }
        if (b.x > 408) { b.x = 408; b.vx = -Math.abs(b.vx); }
        if (b.y < 79) { b.y = 79; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && circleRect(b, this.paddle) && py <= this.paddle.y + 6) {
          b.y = this.paddle.y - b.r; const relative = clamp((b.x - this.paddle.x - this.paddle.w / 2) / (this.paddle.w / 2), -0.94, 0.94);
          const speed = Math.min(525, 330 + this.level * 28 + this.broken * 1.4); b.vx = relative * speed * 0.85; b.vy = -Math.sqrt(speed * speed - b.vx * b.vx); this.chain = 0; this.emit('bounce');
        }
        for (const brick of this.bricks) {
          if (!brick.live || !circleRect(b, brick)) continue;
          this.damage(brick);
          if (px + b.r <= brick.x) { b.x = brick.x - b.r - 0.1; b.vx = -Math.abs(b.vx); }
          else if (px - b.r >= brick.x + brick.w) { b.x = brick.x + brick.w + b.r + 0.1; b.vx = Math.abs(b.vx); }
          else if (py < brick.y) { b.y = brick.y - b.r - 0.1; b.vy = -Math.abs(b.vy); }
          else { b.y = brick.y + brick.h + b.r + 0.1; b.vy = Math.abs(b.vy); }
          break;
        }
        if (b.y > 578 && b.vy > 0 && this.shield) { b.y = 578; b.vy = -Math.abs(b.vy); this.shield--; this.emit('stage'); }
      }
      this.balls = this.balls.filter(b => b.y < 625);
      if (!this.balls.length) { this.hearts--; this.wide = 0; this.flash = 0.15; this.emit('hit'); if (!this.hearts) { this.finish(false, `${this.broken} of ${this.initial} targets cleared. Catch power capsules and use paddle edges to aim.`); return; } this.resetBall(); break; }
    }
    for (const b of this.balls) { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 9) b.trail.shift(); }
    for (const drop of this.drops) { drop.y += dt * 115; if (circleRect({ ...drop, r: 13 }, this.paddle)) { this.power(drop.type); drop.y = 700; } }
    this.drops = this.drops.filter(d => d.y < 630);
    if (this.broken === this.initial) { this.score += this.hearts * 400; this.finish(true, `${this.initial} targets cleared · ${this.hearts} lives left · ${Math.floor(this.time)} seconds.`, this.hearts); }
  }
}

export class Stack extends Round {
  constructor(level = 0) { super(level); this.blocks = [{ x: 100, w: 220 }]; this.current = { x: 10, w: 220 }; this.direction = 1; this.goal = [12, 18, 24, 30][level]; this.combo = 0; this.perfects = 0; this.energy = 100; this.phase = 'move'; this.dropY = 0; this.dropV = 0; this.camera = 0; this.fragments = []; this.focus = false; }
  get progress() { return (this.blocks.length - 1) / this.goal; }
  get top() { return 544 - (this.blocks.length - 1) * 25; }
  action() { if (this.phase === 'move' && !this.done) { this.phase = 'fall'; this.dropY = this.top - 117; this.dropV = 110; this.emit('putt'); } }
  land() {
    const last = this.blocks[this.blocks.length - 1], error = this.current.x - last.x; let next = overlap(this.current, last);
    if (next.w < 7) { this.finish(false, `${this.blocks.length - 1} / ${this.goal} floors. Save Focus for narrow blocks.`); return; }
    const perfect = Math.abs(error) <= 5 - this.level * 0.6;
    if (perfect) { this.combo++; this.perfects++; const extra = this.combo % 3 === 0 ? 14 : 0; next = { x: clamp(last.x - extra / 2, 12, 408 - last.w - extra), w: Math.min(230, last.w + extra) }; this.say(extra ? 'PERFECT ×3 · WIDTH RESTORED' : `PERFECT ×${this.combo}`); this.energy = Math.min(100, this.energy + 22); this.burst(next.x + next.w / 2, this.top + this.camera - 25, '#e4fe7e'); this.emit('coin'); }
    else { this.combo = 0; this.say(`${Math.round(next.w / 220 * 100)}% WIDTH`); this.energy = Math.min(100, this.energy + 6); const cut = this.current.w - next.w; this.fragments.push({ x: error > 0 ? next.x + next.w : this.current.x, y: this.top - 25, w: cut, vy: 40, vx: Math.sign(error) * 50, angle: 0 }); this.emit('land'); }
    this.blocks.push(next); this.score += 100 + this.combo * 60; this.phase = 'settle'; this.settle = 0.22;
    if (this.progress >= 1) { this.score += Math.round(next.w * 10); this.finish(true, `${this.goal} floors · ${this.perfects} perfect drops · ${Math.round(next.w / 220 * 100)}% width preserved.`, next.w > 150 ? 3 : next.w > 75 ? 2 : 1); }
  }
  tick(dt, input = {}) {
    if (this.done) return; this.updateEffects(dt); this.camera += (Math.max(0, (this.blocks.length - 9) * 25) - this.camera) * Math.min(1, dt * 7);
    for (const piece of this.fragments) { piece.vy += dt * 700; piece.y += piece.vy * dt; piece.x += piece.vx * dt; piece.angle += dt * 2; } this.fragments = this.fragments.filter(p => p.y + this.camera < 680);
    if (input.action) this.action();
    this.focus = !!input.focus && this.energy > 1 && this.phase === 'move'; if (this.focus) this.energy = Math.max(0, this.energy - dt * 36);
    if (this.phase === 'move') {
      const wind = this.level ? Math.sin(this.time * (1.2 + this.level * 0.3)) * (12 + this.level * 9) : 0;
      this.wind = wind; const speed = (140 + this.level * 35 + this.blocks.length * 3) * (this.focus ? 0.32 : 1);
      this.current.x += (this.direction * speed + wind) * dt;
      if (this.current.x <= 8) { this.current.x = 8; this.direction = 1; }
      if (this.current.x + this.current.w >= 412) { this.current.x = 412 - this.current.w; this.direction = -1; }
    } else if (this.phase === 'fall') { this.dropV += dt * 1700; this.dropY += this.dropV * dt; if (this.dropY >= this.top - 25) this.land(); }
    else { this.settle -= dt; if (this.settle <= 0) { this.phase = 'move'; this.direction *= -1; const last = this.blocks[this.blocks.length - 1]; this.current = { x: this.direction > 0 ? 8 : 412 - last.w, w: last.w }; } }
  }
}

export class TriathlonRace extends Round {
  constructor(level = 0) {
    super(level); this.random = seeded(840 + level); this.leg = 0; this.distance = 0; this.legLength = 360 + level * 90; this.x = 210; this.energy = 100; this.hearts = 3; this.exhausted = false;
    this.invincible = 0; this.slow = 0; this.scroll = 0; this.transition = 0; this.spawn = 1.6; this.objects = []; this.pattern = 0; this.bonus = 0; this.drafting = false;
    this.rivals = Array.from({ length: 4 }, (_, i) => ({ distance: (3 - i) * 3, x: [94, 290, 155, 340][i], baseX: [94, 290, 155, 340][i], factor: 1.02 + i * 0.025 + level * 0.055, index: i }));
  }
  get totalDistance() { return this.leg * this.legLength + this.distance; }
  get progress() { return clamp(this.totalDistance / (this.legLength * 3), 0, 1); }
  get stage() { return LEGS[this.leg]; }
  get rank() { return 1 + this.rivals.filter(r => r.distance > this.totalDistance).length; }
  tick(dt, input = {}) {
    if (this.done) return; this.updateEffects(dt); this.invincible = Math.max(0, this.invincible - dt); this.slow = Math.max(0, this.slow - dt);
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return; }
    for (const r of this.rivals) { const leg = Math.min(2, Math.floor(r.distance / this.legLength)); r.distance += LEGS[leg].pace * r.factor * (1 + Math.sin(this.time * 0.32 + r.index) * 0.04) * dt; r.x = r.baseX + Math.sin(this.time * 0.7 + r.index) * 18; }
    this.drafting = this.rivals.some(r => r.distance > this.totalDistance + 2 && r.distance < this.totalDistance + 13 && Math.abs(r.x - this.x) < 29);
    if (Number.isFinite(input.targetX)) this.x += clamp(input.targetX - this.x, -310 * dt, 310 * dt);
    this.x = clamp(this.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 265 * dt, 55, 365);
    this.current = this.leg === 0 ? Math.sin(this.time * 0.55) * (6 + this.level * 6) : 0; this.x = clamp(this.x + this.current * dt, 55, 365);
    if (this.energy < 3) this.exhausted = true; if (this.energy > 28) this.exhausted = false;
    this.boosting = !!input.pace && !this.exhausted;
    const drain = this.drafting ? 12 : 25; this.energy = clamp(this.energy + (this.boosting ? -drain : this.drafting ? 23 : 13) * dt, 0, 100);
    const pace = (this.boosting ? 1.47 : this.exhausted ? 0.91 : 1) * (this.slow ? 0.55 : 1) * (this.drafting && this.leg === 1 ? 1.06 : 1);
    this.distance += this.stage.pace * pace * dt; const velocity = this.stage.scroll * pace; this.scroll += velocity * dt;
    this.spawn -= dt;
    if (this.spawn <= 0) {
      const lane = (this.pattern * 2 + this.leg + this.level) % 3;
      this.objects.push({ x: [94, 210, 326][lane], y: -42, pickup: false });
      if (this.pattern % 3 === 1) this.objects.push({ x: [94, 210, 326][(lane + 1) % 3], y: -155, pickup: true });
      if (this.level && this.pattern % 4 === 3) this.objects.push({ x: [94, 210, 326][(lane + 2) % 3], y: -42, pickup: false });
      this.pattern++; this.spawn = 1.55 - this.level * 0.17;
    }
    for (const o of this.objects) {
      o.y += velocity * dt; if (o.hit || Math.abs(o.y - 496) > 30 || Math.abs(o.x - this.x) > 27) continue;
      if (o.pickup) { o.hit = true; this.energy = Math.min(100, this.energy + 32); this.bonus += 125; this.emit('coin'); this.burst(o.x, o.y, '#e8fa84'); }
      else if (!this.invincible) { o.hit = true; this.hearts--; this.slow = 1.2; this.invincible = 1.6; this.flash = 0.2; this.energy = Math.max(0, this.energy - 12); this.emit('hit'); if (!this.hearts) { this.finish(false, 'Race retired. Take the open lane and save stamina for the final run.'); return; } }
    }
    this.objects = this.objects.filter(o => !o.hit && o.y < 650); this.score = Math.floor(this.totalDistance) + this.bonus;
    if (this.distance >= this.legLength) {
      this.distance = this.legLength;
      if (this.leg === 2) { const rank = this.rank; this.score += (6 - rank) * 350 + this.hearts * 150; this.finish(rank <= 3, `Position ${rank} / 5 · ${this.time.toFixed(1)} seconds. ${rank > 3 ? 'Finish in the top three to qualify.' : 'Qualified for the next event.'}`, rank === 1 ? 3 : rank === 2 ? 2 : 1); }
      else { this.leg++; this.distance = 0; this.transition = 1.4; this.objects = []; this.spawn = 1.7; this.energy = Math.min(100, this.energy + 28); this.emit('stage'); }
    }
  }
}

const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export class BikeTrial extends Round {
  constructor(level = 0) {
    super(level); this.x = 90; this.y = this.ground(90); this.vy = 0; this.speed = 125; this.grounded = true; this.angle = Math.atan(this.slope(90)); this.spin = 0;
    this.hearts = 3; this.invincible = 0; this.finishX = [4400, 6100, 8000][level]; this.coins = 0; this.crashes = 0; this.scroll = -26; this.checkpointX = 90; this.nextCheckpoint = 1400;
    this.jumpBuffer = 0; this.coyote = 0.1; this.airTime = 0; this.airRotation = 0; this.gaps = level === 0 ? [] : level === 1 ? [[1150,1270],[2760,2895]] : [[1100,1230],[2280,2430],[3580,3730],[4710,4870]];
    if (level === 1) this.gaps.push([4440,4580]);
    if (level === 2) this.gaps.push([5920,6080],[7140,7300]);
    this.obstacles = Array.from({ length: 9 + level * 4 }, (_, i) => ({ x: 540 + i * 430, w: 37, h: 29 + i % 2 * 9, hit: false })).filter(r => !this.gaps.some(g => r.x > g[0] - 180 && r.x < g[1] + 170));
    this.rings = Array.from({ length: 21 + level * 9 }, (_, i) => { const x = 330 + i * 190; return { x, y: this.ground(x) - (i % 3 === 1 ? 128 : 61), hit: false }; });
  }
  ground(x) { return terrainHeight(x + this.level * 190) + (this.level > 1 ? Math.sin(x / 320) * 16 : 0); }
  slope(x) { return (this.ground(x + 1) - this.ground(x - 1)) / 2; }
  gap(x) { return this.gaps.some(([a,b]) => x > a && x < b); }
  get progress() { return clamp((this.x - 90) / (this.finishX - 90), 0, 1); }
  action() { this.jumpBuffer = 0.15; }
  crash(message) {
    if (this.invincible) return; this.hearts--; this.crashes++; this.invincible = 1.3; this.flash = 0.22; this.emit('hit'); this.say(message, 2);
    if (!this.hearts) { this.finish(false, `Trail retired at ${Math.floor(this.progress * 100)}%. ${message}`); return; }
    this.x = this.checkpointX; this.y = this.ground(this.x); this.vy = 0; this.speed = 110; this.grounded = true; this.angle = Math.atan(this.slope(this.x)); this.spin = 0;
  }
  tick(dt, input = {}) {
    if (this.done) return; this.updateEffects(dt); if (input.action) this.action();
    const count = Math.max(1, Math.ceil(dt / (1 / 120))); for (let i = 0; i < count && !this.done; i++) this.step(dt / count, input);
  }
  step(dt, input) {
    this.invincible = Math.max(0, this.invincible - dt); this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.grounded ? 0.1 : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) { this.vy = -465; this.grounded = false; this.coyote = 0; this.jumpBuffer = 0; this.airTime = 0; this.airRotation = 0; this.emit('jump'); }
    const target = input.pedal ? 238 + this.level * 6 : 140;
    this.speed += clamp(target - this.speed, -190 * dt, 115 * dt); this.x += this.speed * dt; this.scroll = this.x - 116;
    if (this.grounded && this.gap(this.x)) { this.grounded = false; this.vy = 0; this.airTime = 0; this.airRotation = 0; }
    if (this.grounded) { this.y = this.ground(this.x); this.angle = Math.atan(this.slope(this.x)); this.spin = 0; }
    else {
      this.airTime += dt; const lean = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      this.spin += (lean * 5.2 - this.spin) * Math.min(1, dt * 7); const rotation = this.spin * dt;
      this.angle += rotation; this.airRotation += rotation;
      if (!lean) this.angle += wrapAngle(Math.atan(this.slope(this.x + 35)) - this.angle) * dt * 1.8;
      this.vy += 1040 * dt; this.y += this.vy * dt;
      if (!this.gap(this.x) && this.y >= this.ground(this.x) && this.vy > 0) {
        const error = Math.abs(wrapAngle(this.angle - Math.atan(this.slope(this.x))));
        if (error > 1.05) { this.crash('Bad landing · Match your wheels to the slope.'); return; }
        this.y = this.ground(this.x); this.vy = 0; this.grounded = true;
        if (this.airTime > 0.45) { const points = Math.round(this.airTime * 120) + (error < 0.2 ? 150 : 0) + Math.floor(Math.abs(this.airRotation) / (Math.PI * 2)) * 500; this.score += points; this.say(error < 0.2 ? `CLEAN LANDING +${points}` : `AIR TIME +${points}`, 1); this.emit('land'); }
      }
      if (this.y > 665) { this.crash('Missed the gap · Jump near the marked edge.'); return; }
    }
    for (const rock of this.obstacles) if (!rock.hit && !this.invincible && Math.abs(this.x - rock.x) < rock.w / 2 + 24 && this.y > this.ground(rock.x) - rock.h + 6) { rock.hit = true; this.crash('Rock strike · Jump before your front wheel reaches it.'); return; }
    for (const r of this.rings) if (!r.hit && Math.hypot(this.x - r.x, this.y - 45 - r.y) < 37) { r.hit = true; this.coins++; this.score += 100; this.emit('coin'); }
    if (this.x >= this.nextCheckpoint && !this.gap(this.x) && this.grounded) { this.checkpointX = this.x; this.nextCheckpoint += 1400; this.say('CHECKPOINT SAVED'); this.emit('stage'); }
    if (this.progress >= 1) { this.score += this.hearts * 500 + Math.max(0, Math.round((60 - this.time) * 25)); this.finish(true, `${this.time.toFixed(1)} s · ${this.coins} / ${this.rings.length} rings · ${this.crashes} falls.`, this.crashes === 0 && this.coins >= this.rings.length / 2 ? 3 : this.crashes <= 1 ? 2 : 1); }
  }
}

export class GolfCup extends Golf {
  constructor(level = 0) { super(); this.level = level; this.firstHole = level * 3; this.lastHole = this.firstHole + 2; this.hole = this.firstHole; this.loadHole(); this.medal = 0; this.shotTrail = []; }
  get progress() { return (this.hole - this.firstHole + (this.phase === 'holed' ? 1 : 0)) / 3; }
  get target() { return COURSES.slice(this.firstHole, this.lastHole + 1).reduce((n,c) => n + c.par, 0) + 4; }
  tick(dt) {
    if (this.done) return;
    if (this.phase === 'holed' && this.hole === this.lastHole && this.timer <= dt) {
      this.timer = 0; const won = this.totalStrokes <= this.target && !this.cards.some(c => c.pickedUp); this.medal = won ? this.totalStrokes <= this.target - 4 ? 3 : this.totalStrokes <= this.target - 2 ? 2 : 1 : 0;
      this.finish(won, `${this.totalStrokes} strokes · Target ${this.target}. ${won ? 'Cup completed.' : 'Try again to qualify.'}`); return;
    }
    super.tick(dt);
    if (this.moving) { this.shotTrail.push({ x: this.ball.x, y: this.ball.y }); if (this.shotTrail.length > 18) this.shotTrail.shift(); } else this.shotTrail = [];
  }
}
export const MODELS = { 'neon-rally': Rally, 'orbit-breaker': Breaker, 'stack-circuit': Stack, 'triathlon-sprint': TriathlonRace, 'bike-rider': BikeTrial, 'pocket-golf': GolfCup };
