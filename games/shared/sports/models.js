// Gameplay is independent of the DOM so collision and course rules can be tested.
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const LEGS = [
  { name: 'Swim', pace: 18, scroll: 150, color: '#79e8e0' },
  { name: 'Cycle', pace: 27, scroll: 225, color: '#f9ba84' },
  { name: 'Run', pace: 22, scroll: 185, color: '#cafd84' }
];
class Round {
  constructor() { this.time = 0; this.score = 0; this.done = false; this.won = false; this.events = []; }
  emit(type) { this.events.push(type); }
  finish(won, message) { if (this.done) return; this.done = true; this.won = won; this.message = message; this.emit(won ? 'win' : 'end'); }
}

export class Triathlon extends Round {
  constructor(random = Math.random) {
    super(); this.random = random; this.leg = 0; this.distance = 0; this.x = 210;
    this.energy = 100; this.exhausted = false; this.hearts = 3; this.invincible = 0;
    this.objects = []; this.spawn = 1.8; this.scroll = 0; this.transition = 0; this.bonus = 0;
  }
  get totalDistance() { return this.leg * 400 + this.distance; }
  get progress() { return this.totalDistance / 1200; }
  get stage() { return LEGS[this.leg]; }
  tick(dt, input = {}) {
    if (this.done) return;
    this.time += dt; this.invincible = Math.max(0, this.invincible - dt);
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return; }
    if (Number.isFinite(input.targetX)) this.x += clamp(input.targetX - this.x, -330 * dt, 330 * dt);
    this.x = clamp(this.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 275 * dt, 58, 362);
    if (this.energy < 4) this.exhausted = true;
    if (this.energy > 27) this.exhausted = false;
    this.boosting = !!input.pace && !this.exhausted;
    this.energy = clamp(this.energy + dt * (this.boosting ? -26 : 13), 0, 100);
    const multiplier = this.boosting ? 1.5 : 1;
    const velocity = this.stage.scroll * multiplier;
    this.distance += this.stage.pace * multiplier * dt; this.scroll += velocity * dt;
    this.spawn -= dt;
    if (this.spawn <= 0) {
      const lane = Math.floor(this.random() * 3);
      this.objects.push({ x: [94, 210, 326][lane], y: -50, pickup: this.random() < 0.3, hit: false });
      this.spawn = 1.25 + this.random() * 0.5;
    }
    for (const object of this.objects) {
      object.y += velocity * dt;
      if (object.hit || Math.abs(object.y - 496) > 32 || Math.abs(object.x - this.x) > 28) continue;
      if (object.pickup) {
        this.energy = Math.min(100, this.energy + 24); this.bonus += 75; object.hit = true; this.emit('coin');
      } else if (!this.invincible) {
        this.hearts--; this.invincible = 1.5; this.energy = Math.max(0, this.energy - 18); object.hit = true; this.emit('hit');
        if (!this.hearts) { this.score = Math.floor(this.totalDistance) + this.bonus; this.finish(false, 'A tough race. Rest up and try for the finish line.'); return; }
      }
    }
    this.objects = this.objects.filter(o => o.y < 665 && !o.hit);
    this.score = Math.floor(this.totalDistance) + this.bonus;
    if (this.distance >= 400) {
      this.distance = 400;
      if (this.leg === 2) {
        this.score = 1200 + this.bonus + this.hearts * 200 + Math.max(0, Math.round((85 - this.time) * 20));
        this.finish(true, `All three stages finished in ${this.time.toFixed(1)} seconds. ${this.hearts} hearts saved!`);
      } else {
        this.leg++; this.distance = 0; this.transition = 1.8; this.objects = []; this.spawn = 1.7;
        this.energy = Math.min(100, this.energy + 35); this.emit('stage');
      }
    }
  }
}

export function terrainHeight(x) { return 440 - 38 * Math.sin(x / 185) - 22 * Math.sin(x / 73); }
export function terrainSlope(x) { return -38 / 185 * Math.cos(x / 185) - 22 / 73 * Math.cos(x / 73); }
export class Bike extends Round {
  constructor() {
    super(); this.x = 90; this.y = terrainHeight(this.x); this.vy = 0; this.speed = 120;
    this.grounded = true; this.angle = Math.atan(terrainSlope(this.x)); this.hearts = 3;
    this.invincible = 0; this.finishX = 4400; this.coins = 0; this.jumps = 0; this.scroll = 0;
    this.obstacles = Array.from({ length: 9 }, (_, i) => ({ x: 520 + i * 425, w: 34 + (i % 3) * 5, h: 28 + (i % 2) * 9, hit: false }));
    this.rings = Array.from({ length: 18 }, (_, i) => ({ x: 325 + i * 218, y: terrainHeight(325 + i * 218) - (i % 2 ? 125 : 60), hit: false }));
  }
  get progress() { return clamp((this.x - 90) / (this.finishX - 90), 0, 1); }
  jump() { if (!this.done && this.grounded) { this.vy = -470; this.grounded = false; this.jumps++; this.emit('jump'); } }
  tick(dt, input = {}) {
    if (this.done) return;
    if (input.jump) this.jump();
    const count = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < count && !this.done; i++) this.step(dt / count, input);
  }
  step(dt, input) {
    this.time += dt; this.invincible = Math.max(0, this.invincible - dt);
    const target = input.pedal ? 225 : 125;
    this.speed += clamp(target - this.speed, -120 * dt, 90 * dt);
    this.x += this.speed * dt; this.scroll = this.x - 110;
    const ground = terrainHeight(this.x);
    if (this.grounded) { this.y = ground; this.angle = Math.atan(terrainSlope(this.x)); }
    else {
      this.vy += 1050 * dt; this.y += this.vy * dt;
      const angleTarget = clamp(this.vy / 1000, -0.28, 0.24);
      this.angle += (angleTarget - this.angle) * Math.min(1, dt * 8);
      if (this.y >= ground && this.vy > 0) { this.y = ground; this.vy = 0; this.grounded = true; this.emit('land'); }
    }
    for (const rock of this.obstacles) {
      if (rock.hit || this.invincible || Math.abs(this.x - rock.x) > rock.w / 2 + 20) continue;
      if (this.y < terrainHeight(rock.x) - rock.h + 7) continue;
      rock.hit = true; this.hearts--; this.speed = 90; this.invincible = 1.5; this.emit('hit');
      if (this.hearts === 0) { this.finish(false, 'The trail got rocky. Jump a little earlier and try again.'); return; }
    }
    for (const ring of this.rings) {
      if (!ring.hit && Math.hypot(this.x - ring.x, this.y - 43 - ring.y) < 40) { ring.hit = true; this.coins++; this.emit('coin'); }
    }
    this.score = Math.round((this.x - 90) / 4) + this.coins * 100;
    if (this.x >= this.finishX) {
      this.score += this.hearts * 250 + Math.max(0, Math.round((45 - this.time) * 30));
      this.finish(true, `Trail complete in ${this.time.toFixed(1)} seconds. ${this.coins} of 18 rings collected.`);
    }
  }
}

export const COURSES = [
  { name: 'First light', par: 2, tee: [210, 510], cup: [210, 155], walls: [], sand: [], water: [] },
  { name: 'The bank shot', par: 3, tee: [80, 510], cup: [330, 140], walls: [{ x: 140, y: 285, w: 165, h: 20 }], sand: [], water: [] },
  { name: 'Sandy shortcut', par: 3, tee: [80, 510], cup: [335, 145], walls: [{ x: 195, y: 340, w: 180, h: 18 }], sand: [{ x: 48, y: 220, w: 125, h: 95 }], water: [] },
  { name: 'Water crossing', par: 4, tee: [90, 515], cup: [315, 145], walls: [{ x: 24, y: 200, w: 160, h: 18 }], sand: [], water: [{ x: 108, y: 295, w: 210, h: 64 }] },
  { name: 'Switchback', par: 5, tee: [75, 520], cup: [325, 140], walls: [{ x: 24, y: 400, w: 252, h: 18 }, { x: 142, y: 240, w: 254, h: 18 }], sand: [{ x: 288, y: 320, w: 91, h: 65 }], water: [] },
  { name: 'The island green', par: 4, tee: [82, 515], cup: [327, 145], walls: [{ x: 24, y: 220, w: 218, h: 18 }], sand: [{ x: 49, y: 110, w: 118, h: 85 }], water: [{ x: 153, y: 340, w: 228, h: 63 }] }
];
const inside = (ball, rect) => ball.x > rect.x && ball.x < rect.x + rect.w && ball.y > rect.y && ball.y < rect.y + rect.h;
function bounceRect(ball, rect) {
  const nx = clamp(ball.x, rect.x, rect.x + rect.w), ny = clamp(ball.y, rect.y, rect.y + rect.h);
  let dx = ball.x - nx, dy = ball.y - ny, distance = Math.hypot(dx, dy);
  if (distance >= ball.r) return;
  if (distance === 0) {
    const sides = [
      { d: ball.x - rect.x, x: -1, y: 0 }, { d: rect.x + rect.w - ball.x, x: 1, y: 0 },
      { d: ball.y - rect.y, x: 0, y: -1 }, { d: rect.y + rect.h - ball.y, x: 0, y: 1 }
    ].sort((a, b) => a.d - b.d);
    dx = sides[0].x; dy = sides[0].y; distance = -sides[0].d;
  } else { dx /= distance; dy /= distance; }
  ball.x += dx * (ball.r - distance + 0.01); ball.y += dy * (ball.r - distance + 0.01);
  const speed = ball.vx * dx + ball.vy * dy;
  if (speed < 0) { ball.vx -= 1.75 * speed * dx; ball.vy -= 1.75 * speed * dy; }
}
export class Golf extends Round {
  constructor() {
    super(); this.hole = 0; this.cards = []; this.totalStrokes = 0; this.phase = 'play'; this.timer = 0;
    this.loadHole();
  }
  get course() { return COURSES[this.hole]; }
  get moving() { return Math.hypot(this.ball.vx, this.ball.vy) > 0; }
  get canShoot() { return !this.done && this.phase === 'play' && !this.moving; }
  get progress() { return (this.hole + (this.phase === 'holed' ? 1 : 0)) / COURSES.length; }
  loadHole() {
    const [x, y] = this.course.tee;
    this.ball = { x, y, r: 8, vx: 0, vy: 0 }; this.lastSafe = { x, y }; this.strokes = 0;
    this.phase = 'play'; this.notice = ''; this.noticeTimer = 0;
  }
  shoot(vx, vy) {
    if (!this.canShoot || !Number.isFinite(vx) || !Number.isFinite(vy)) return false;
    const length = Math.hypot(vx, vy); if (length < 20) return false;
    const scale = Math.min(length, 520) / length;
    this.ball.vx = vx * scale; this.ball.vy = vy * scale;
    this.lastSafe = { x: this.ball.x, y: this.ball.y }; this.strokes++; this.totalStrokes++; this.emit('putt');
    return true;
  }
  finishHole(pickedUp = false) {
    this.phase = 'holed'; this.timer = 1.8; this.ball.vx = this.ball.vy = 0;
    const difference = this.strokes - this.course.par;
    this.notice = pickedUp ? `${this.strokes} strokes · On to the next green` : this.strokes === 1 ? 'Hole in one!' : difference <= -2 ? 'Eagle!' : difference === -1 ? 'Birdie!' : difference === 0 ? 'Par!' : `Holed in ${this.strokes}`;
    this.score += pickedUp ? 0 : Math.max(0, (this.course.par + 4 - this.strokes) * 100);
    this.cards.push({ strokes: this.strokes, par: this.course.par, pickedUp }); this.emit('hole');
  }
  tick(dt) {
    if (this.done) return;
    this.time += dt; this.noticeTimer = Math.max(0, this.noticeTimer - dt);
    if (this.phase !== 'play') {
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.phase === 'water') {
        Object.assign(this.ball, this.lastSafe, { vx: 0, vy: 0 }); this.phase = 'play'; this.notice = 'Water penalty +1 · Try a different line'; this.noticeTimer = 3;
        if (this.strokes >= 8) this.finishHole(true);
      } else if (this.hole === COURSES.length - 1) {
        const totalPar = COURSES.reduce((sum, c) => sum + c.par, 0);
        const difference = this.totalStrokes - totalPar;
        this.finish(true, `Six greens in ${this.totalStrokes} strokes (${difference > 0 ? '+' : ''}${difference} to par).`);
      } else { this.hole++; this.loadHole(); this.emit('stage'); }
      return;
    }
    if (!this.moving) return;
    const steps = Math.ceil(dt / (1 / 180));
    for (let i = 0; i < steps && this.phase === 'play'; i++) this.step(dt / steps);
  }
  step(dt) {
    const b = this.ball, course = this.course;
    const friction = course.sand.some(rect => inside(b, rect)) ? 4.4 : 1.15;
    const damping = Math.exp(-friction * dt); b.vx *= damping; b.vy *= damping;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < 24 + b.r) { b.x = 24 + b.r; b.vx = Math.abs(b.vx) * 0.78; }
    if (b.x > 396 - b.r) { b.x = 396 - b.r; b.vx = -Math.abs(b.vx) * 0.78; }
    if (b.y < 88 + b.r) { b.y = 88 + b.r; b.vy = Math.abs(b.vy) * 0.78; }
    if (b.y > 568 - b.r) { b.y = 568 - b.r; b.vy = -Math.abs(b.vy) * 0.78; }
    for (const wall of course.walls) bounceRect(b, wall);
    if (course.water.some(rect => inside(b, rect))) {
      b.vx = b.vy = 0; this.strokes++; this.totalStrokes++; this.phase = 'water'; this.timer = 0.75;
      this.notice = 'Splash! One penalty stroke'; this.emit('water'); return;
    }
    if (Math.hypot(b.x - course.cup[0], b.y - course.cup[1]) < 12 && Math.hypot(b.vx, b.vy) < 160) {
      b.x = course.cup[0]; b.y = course.cup[1]; this.finishHole(); return;
    }
    if (Math.hypot(b.vx, b.vy) < 7) {
      b.vx = b.vy = 0;
      if (this.strokes >= 8) this.finishHole(true);
    }
  }
}
