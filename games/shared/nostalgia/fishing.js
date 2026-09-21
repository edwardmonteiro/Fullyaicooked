import {W, clamp, Random, approach, overlap} from './common.js';

export const FISH_ROWS = [108, 134, 160, 186, 212, 238];
export const fishMouth = fish => ({x: fish.x + fish.dir * 8, y: fish.y});
export const sharkBox = shark => ({x: shark.x - 21, y: shark.y - 7, w: 42, h: 14});
export const catchBox = hook => ({x: hook.x - 7, y: hook.y - 4, w: 14, h: 8});

// Both anglers obey the same controls, hook priority, shark and scoring rules.
export function fishingPilot(game, index = 1) {
  const hook = game.hooks[index], shark = game.shark;
  if (hook.fish !== null) {
    const safeX = shark.x < 192 ? (index ? 357 : 174) : (index ? 210 : 27);
    const crossing = hook.y > shark.y - 14 && hook.y < shark.y + 45;
    const x = crossing ? safeX : hook.x;
    return {left: x < hook.x - 3, right: x > hook.x + 3,
      action: !crossing || Math.abs(shark.x - hook.x) > 47 || hook.y < shark.y - 13};
  }
  const min = index ? 204 : 18, max = index ? 366 : 180;
  let best = null, cost = Infinity;
  for (const fish of game.fish) {
    if (fish.owner !== null || fish.cooldown > 0) continue;
    if (game.variant === 'calm' && index === 1 && fish.row > 3) continue;
    const mouth = fishMouth(fish);
    const reachable = mouth.x > min + 4 && mouth.x < max - 4;
    if (!reachable) continue;
    const c = Math.abs(mouth.x - hook.x) / 80 + Math.abs(mouth.y - hook.y) / 96 - fish.value * .25;
    if (c < cost) { best = fish; cost = c; }
  }
  if (!best) return {down: hook.y < 210};
  const mouth = fishMouth(best), x = mouth.x + best.dir * best.speed * .035;
  return {left: x < hook.x - 1.2, right: x > hook.x + 1.2,
    up: mouth.y < hook.y - 1.1, down: mouth.y > hook.y + 1.1};
}

export class Fishing {
  constructor({seed = 1980, variant = 'classic'} = {}) {
    this.rng = new Random(seed); this.variant = variant; this.time = 0; this.scores = [0, 0];
    this.score = 0; this.done = false; this.won = false; this.message = ''; this.events = [];
    this.hooks = [0, 1].map(i => ({x: i ? 333 : 51, y: 88, fish: null, serial: 0}));
    this.serial = 0; this.landed = [0, 0]; this.stolen = [0, 0]; this.feedback = ''; this.feedbackTime = 0;
    this.shark = {x: 190, y: 91, dir: 1, speed: 52, bite: 0};
    this.fish = FISH_ROWS.flatMap((y, row) => [0, 1].map(side => ({
      x: 75 + side * 202 + this.rng.next() * 24, y, row, value: 2 + Math.floor(row / 2) * 2,
      dir: side ? -1 : 1, origin: side, speed: 20 + row * 3 + this.rng.next() * 9, owner: null, cooldown: 0
    })));
    this.think = 0; this.cpu = {}; this.catchSerial = 0;
  }
  resetFish(fish) { fish.owner = null; fish.x = fish.origin ? W + 12 : -12; fish.dir = fish.origin ? -1 : 1; fish.y = FISH_ROWS[fish.row]; fish.cooldown = .55; }
  release(index, landed) {
    const hook = this.hooks[index], fish = this.fish[hook.fish];
    if (!fish) return;
    if (landed) {
      this.scores[index] = Math.min(99, this.scores[index] + fish.value); this.landed[index]++;
      this.events.push(index ? 'cpu-catch' : 'catch');
      this.feedback = `${index ? 'Rival' : 'Você'}: +${fish.value} lb`; this.feedbackTime = 1;
    } else { this.stolen[index]++; this.shark.bite = .4; this.events.push('bite'); this.feedback = 'O tubarão levou o peixe!'; this.feedbackTime = 1; }
    this.resetFish(fish); hook.fish = null; hook.y = 79; this.score = this.scores[0];
    if (this.scores[index] >= 99) { this.done = true; this.won = index === 0; this.message = this.won ? 'Você chegou a 99 libras primeiro.' : 'O rival chegou a 99 libras.'; }
  }
  tick(dt, input = {}) {
    if (this.done) return;
    this.events = []; this.time += dt; this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    this.think -= dt;
    if (this.think <= 0) { this.cpu = fishingPilot(this); this.think = this.variant === 'calm' ? .34 : this.variant === 'expert' ? .08 : .17; }
    const shark = this.shark;
    shark.bite = Math.max(0, shark.bite - dt); shark.y = 91 + Math.sin(this.time * .72) * 3;
    shark.x += shark.dir * (shark.speed + 12 * Math.sin(this.time * .4)) * dt;
    if (shark.x > W - 22 || shark.x < 22) { shark.dir *= -1; shark.x = clamp(shark.x, 22, W - 22); }
    for (const fish of this.fish) {
      fish.cooldown = Math.max(0, fish.cooldown - dt);
      if (fish.owner !== null) continue;
      fish.x += fish.dir * fish.speed * dt;
      if (fish.x > W + 12) fish.x = -12;
      if (fish.x < -12) fish.x = W + 12;
    }
    const priority = this.hooks.filter(h => h.fish !== null).sort((a, b) => a.serial - b.serial)[0];
    for (let i = 0; i < 2; i++) {
      const h = this.hooks[i], c = i ? this.cpu : input, min = i ? 204 : 18, max = i ? 366 : 180;
      h.x = clamp(Number.isFinite(c.targetX) ? approach(h.x, c.targetX, 83 * dt) : h.x + ((c.right ? 1 : 0) - (c.left ? 1 : 0)) * 83 * dt, min, max);
      if (h.fish === null) {
        h.y = clamp(Number.isFinite(c.targetY) ? approach(h.y, c.targetY, 100 * dt) : h.y + ((c.down ? 1 : 0) - (c.up ? 1 : 0)) * 100 * dt, 78, 248);
        const radius = this.variant === 'expert' ? 3 : 5;
        for (let j = 0; j < this.fish.length; j++) {
          const f = this.fish[j], mouth = fishMouth(f);
          if (f.owner === null && !f.cooldown && Math.abs(h.x - mouth.x) < radius && Math.abs(h.y - mouth.y) < radius) {
            h.fish = j; h.serial = ++this.serial; f.owner = i; this.events.push('hook'); this.catchSerial++; break;
          }
        }
      } else {
        h.y -= dt * (c.action && h === priority ? 88 : 15);
        const fish = this.fish[h.fish]; fish.x = h.x; fish.y = h.y;
        if (overlap(catchBox(h), sharkBox(shark))) this.release(i, false);
        else if (h.y <= 72) this.release(i, true);
        if (this.done) break;
      }
    }
  }
}
