import { clamp } from './river.js';
export const DAY_LENGTH = 120;
// Long authored bends with smooth entries/exits; the same centerline drives physics and projection.
const BENDS=[0,0,65,65,-50,-50,0,80,0,-75,0,0];
export function roadCurve(distance) { const u=Math.max(0,distance)/1200,i=Math.floor(u),t=u-i,e=t*t*(3-2*t);return BENDS[i%BENDS.length]*(1-e)+BENDS[(i+1)%BENDS.length]*e; }
export function roadProjection(m,z) { const p=1/(1+z/95);return {x:80+(roadCurve(m.distance+z)-roadCurve(m.distance))*p,y:52+p*103,half:8+p*66,p}; }
export function trafficHit(m,car) {
 const r=roadProjection(m,Math.max(-10,car.z)),center=r.x+car.x*r.half*.83,player=80+m.x*61;
 // Match the visible solid body, not the much larger tire/flash rectangle.
 return car.z>-18&&Math.abs(center-player)<(9*r.p+9.5)/2&&r.y>143&&r.y-16*r.p<156;
}
export class Enduro {
  constructor() {
    Object.assign(this, { x:0, lateral:0, speed:0, distance:0, day:1, dayTime:0, time:0, passed:0, totalPassed:0, quota:200, score:0, done:false, won:false, bump:0, spawn:.5, seed:2600, serial:0, trophy:false, collisions:0, lastLane:1 });
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
    this.x = clamp(this.x + this.lateral * dt * Math.min(1,this.speed / 40) - bend * .006, -1.3, 1.3);
    if (Math.abs(this.x) > 1.02) this.speed = Math.max(0, this.speed - 105 * dt);
    this.distance += this.speed * dt; this.score = Math.floor(this.distance / 4.5); // Distance record in meters.
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn += this.day === 1 ? .39 : Math.max(.27,.31 - this.day * .002);
      let lane=Math.floor(this.random()*3);
      // Avoid stacked duplicate bodies at the horizon while preserving gaps between traffic.
      if(lane===this.lastLane)lane=(lane+1+Math.floor(this.random()*2))%3;
      this.lastLane=lane;
      const x=[-.69,0,.69][lane]+(this.random()-.5)*Math.min(.34,.08+this.day*.035);
      this.cars.push({id:this.serial++,z:490+this.random()*36,x,baseX:x,sway:this.random()*Math.PI*2,speed:76+this.random()*36+Math.min(38,this.day*4),passed:false,countedDay:0,color:Math.floor(this.random()*5)});
    }
    for (const car of this.cars) {
      car.z += (car.speed - this.speed) * dt;
      if(Number.isFinite(car.baseX))car.x=car.baseX+Math.sin(this.time*.28+car.sway)*Math.min(.08,this.day*.015);
      if (!this.bump && trafficHit(this,car)) {
        this.bump = .65; this.collisions++; this.speed = Math.min(this.speed,42); this.x = clamp(this.x + (this.x >= car.x ? .15 : -.15), -1.3,1.3); this.events.push('hit');
      }
      if (car.z < -14 && !car.passed) { car.passed = true; car.countedDay=this.day; this.passed++; this.totalPassed++; this.events.push('pass'); if(this.passed === this.quota)this.events.push('qualified'); }
      if (car.z > 14 && car.passed) { car.passed = false; if(car.countedDay===this.day)this.passed = Math.max(0,this.passed-1); this.totalPassed=Math.max(0,this.totalPassed-1); }
    }
    this.cars = this.cars.filter(c => c.z > -160 && c.z < 720);
    if (this.dayTime >= DAY_LENGTH) {
      if (!this.qualified) { this.done = true; this.message = `O dia amanheceu. Faltaram ${this.quota - this.passed} carros. Acelere nas passagens livres e freie antes dos bloqueios.`; }
      else { this.day++; this.dayTime -= DAY_LENGTH; this.passed = 0; this.quota = 300; this.events.push('day'); if(this.day===6) {this.trophy=true;this.events.push('extra');} }
    }
  }
}
