import { clamp } from './river.js';
export const DAY_LENGTH = 120;
export function roadCurve(distance) { return Math.sin(distance / 780) * 35 + Math.sin(distance / 1730) * 24; }
export class Enduro {
  constructor() {
    Object.assign(this, { x:0, lateral:0, speed:0, distance:0, day:1, dayTime:0, time:0, passed:0, totalPassed:0, quota:200, score:0, done:false, won:false, bump:0, spawn:.5, seed:2600, serial:0, trophy:false });
    this.events = []; this.cars = [];
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  get phase() {
    const t = this.dayTime / DAY_LENGTH;
    return t < .25 ? 'day' : t < .42 ? 'ice' : t < .54 ? 'sunset' : t < .8 ? 'night' : t < .94 ? 'fog' : 'dawn';
  }
  get qualified() { return this.passed >= this.quota; }
  step(dt, input = {}) {
    this.events = [];
    if (this.done) return;
    this.time += dt; this.dayTime += dt; this.bump = Math.max(0, this.bump - dt);
    if (input.down) this.speed -= 100 * dt;
    else if (input.action || input.up) this.speed += 63 * dt;
    this.speed = clamp(this.speed, 0, 260);
    const steer = Number(!!input.right) - Number(!!input.left), ice = this.phase === 'ice';
    this.lateral += (steer * (ice ? .97 : 1.5) - this.lateral) * Math.min(1, dt * (ice ? 2 : 10));
    const bend = roadCurve(this.distance + this.speed * dt) - roadCurve(this.distance);
    this.x = clamp(this.x + this.lateral * dt * Math.min(1,this.speed / 40) - bend * .0035, -1.3, 1.3);
    if (Math.abs(this.x) > 1.02) this.speed = Math.max(35, this.speed - 150 * dt);
    this.distance += this.speed * dt; this.score = Math.floor(this.distance / 4.5); // Distance record in meters.
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn += this.day === 1 ? .39 : Math.max(.27,.31 - this.day * .002);
      this.cars.push({ id:this.serial++, z:490 + this.random() * 36, x:[-.69,0,.69][Math.floor(this.random()*3)] + (this.random()-.5)*.24, speed:76 + this.random() * 36 + Math.min(38, this.day * 4), passed:false, countedDay:0, color:Math.floor(this.random()*5) });
    }
    for (const car of this.cars) {
      car.z += (car.speed - this.speed) * dt;
      if (!this.bump && Math.abs(car.z) < 13 && Math.abs(car.x - this.x) < .23) {
        this.bump = .65; this.speed = 38; this.x = clamp(this.x + (this.x >= car.x ? .15 : -.15), -1.3,1.3); this.events.push('hit');
      }
      if (car.z < -14 && !car.passed) { car.passed = true; car.countedDay=this.day; this.passed++; this.totalPassed++; this.events.push('pass'); if(this.passed === this.quota)this.events.push('qualified'); }
      if (car.z > 14 && car.passed) { car.passed = false; if(car.countedDay===this.day)this.passed = Math.max(0,this.passed-1); this.totalPassed--; }
    }
    this.cars = this.cars.filter(c => c.z > -160 && c.z < 720);
    if (this.dayTime >= DAY_LENGTH) {
      if (!this.qualified) { this.done = true; this.message = `Dawn arrived with ${this.quota - this.passed} cars still to pass. Keep your speed on clear stretches.`; }
      else { this.day++; this.dayTime -= DAY_LENGTH; this.passed = 0; this.quota = 300; this.events.push('day'); if(this.day===6) {this.trophy=true;this.events.push('extra');} }
    }
  }
}
