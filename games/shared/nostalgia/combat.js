import {W, H, wrap, delta, clamp, Random, approach} from './common.js';
import {segmentBox} from '../precision/common.js';

export const CLOUDS = [{x: 68, y: 106, w: 78, h: 45}, {x: 231, y: 151, w: 87, h: 43}];
export const PLANE_PARTS = [[-12,-2,25,4],[-4,-8,13,3],[-4,5,13,3],[-9,-6,3,12]];
export const JET_PARTS = [[-12,-2,26,4],[-4,-10,6,20],[-10,-6,3,12]];
export const angleDelta = (a, b) => delta(a, b, Math.PI * 2);
export const hiddenByCloud = (p, variant) => variant !== 'jets' && CLOUDS.some(c => p.x > c.x && p.x < c.x+c.w && p.y > c.y && p.y < c.y+c.h);

// The renderer and projectile checks share these exact solid rectangles.
export function planeContact(x, y, dx, dy, plane, jet = false) {
  const co = Math.cos(plane.angle), si = Math.sin(plane.angle);
  let hit = null;
  for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
    const px = x - plane.x - ox, py = y - plane.y - oy;
    const lx = px*co + py*si, ly = -px*si + py*co;
    const vx = dx*co + dy*si, vy = -dx*si + dy*co;
    for (const [a,b,w,h] of jet ? JET_PARTS : PLANE_PARTS) {
      const contact = segmentBox(lx, ly, vx, vy, a-1, b-1, a+w+1, b+h+1);
      if (contact && (hit === null || contact.t < hit)) hit = contact.t;
    }
  }
  return hit;
}

export function combatPilot(game, index = 1) {
  const p = game.planes[index], enemy = game.planes[1-index];
  // A hidden rival is not tracked: retain the last observed position and heading.
  if (!hiddenByCloud(enemy, game.variant) || index === 0) game.observed[index] = {...enemy};
  const target = game.observed[index], vx = delta(target.x, p.x, W), vy = delta(target.y, p.y, H);
  const distance = Math.hypot(vx, vy), lead = Math.min(.55, distance / 290);
  const aim = Math.atan2(vy + Math.sin(target.angle)*target.speed*lead, vx + Math.cos(target.angle)*target.speed*lead);
  const error = angleDelta(aim, p.angle);
  const c = {left: error < -.065, right: error > .065, up: distance > 115, down: distance < 60,
    action: Math.abs(error) < .2 && !hiddenByCloud(enemy, game.variant)};
  // Break a tight circle when the two craft pass; avoid simply orbiting forever.
  if (distance < 36) { c.left = false; c.right = true; c.up = true; c.down = false; }
  return c;
}

export class Combat {
  constructor({seed = 1977, variant = 'classic'} = {}) {
    this.rng = new Random(seed); this.variant = variant; this.time = 0; this.remaining = 136;
    this.scores = [0, 0]; this.score = 0; this.done = false; this.won = false; this.draw = false; this.message = '';
    this.events = []; this.bullets = []; this.shots = [0,0]; this.hitCount = [0,0]; this.think = 0; this.cpu = {};
    this.planes = [{x:72,y:88,angle:0},{x:310,y:206,angle:Math.PI}].map(p => ({...p,speed:74,stun:0,immune:0,cooldown:0}));
    this.observed = [{...this.planes[1]}, {...this.planes[0]}]; this.feedback = ''; this.feedbackTime = 0;
  }
  tick(dt, input = {}) {
    if (this.done) return;
    dt = Math.min(dt, this.remaining); this.events = []; this.time += dt; this.remaining = Math.max(0,136-this.time);
    this.feedbackTime = Math.max(0,this.feedbackTime-dt); this.think -= dt;
    if (this.think <= 0) { this.cpu = combatPilot(this); this.think = .18; }
    const controls = [input,this.cpu], jet = this.variant === 'jets', gun = this.variant === 'rapid';
    for (let i=0;i<2;i++) {
      const p=this.planes[i], c=controls[i]; p.cooldown=Math.max(0,p.cooldown-dt); p.immune=Math.max(0,p.immune-dt);
      if (p.stun>0) { p.stun=Math.max(0,p.stun-dt); p.angle+=7*dt; if (!p.stun) p.immune=1; }
      else {
        p.angle=wrap(p.angle+((c.right?1:0)-(c.left?1:0))*(jet?2.55:2.2)*dt,Math.PI*2);
        const speed=(c.down?48:c.up?110:76)*(jet?1.3:1);
        p.speed=approach(p.speed,speed,180*dt);
        const limit=gun?3:1;
        if(c.action&&!p.cooldown&&this.bullets.filter(b=>b.owner===i).length<limit){
          this.bullets.push({x:wrap(p.x+Math.cos(p.angle)*16,W),y:wrap(p.y+Math.sin(p.angle)*16,H),
            vx:Math.cos(p.angle)*280,vy:Math.sin(p.angle)*280,life:gun?.62:.85,owner:i});
          p.cooldown=gun?.14:.25;this.shots[i]++;this.events.push('shoot');
        }
      }
      const speed=p.stun?28:p.speed;
      p.x=wrap(p.x+Math.cos(p.angle)*speed*dt,W);p.y=wrap(p.y+Math.sin(p.angle)*speed*dt,H);
    }
    const dead=new Set();
    for (const b of this.bullets) {
      const target=this.planes[1-b.owner], dx=b.vx*dt, dy=b.vy*dt;
      if(!target.stun&&!target.immune&&planeContact(b.x,b.y,dx,dy,target,jet)!==null){
        this.scores[b.owner]++;this.hitCount[b.owner]++;target.stun=.8;target.immune=1.8;dead.add(b);
        this.events.push('hit');this.feedback=b.owner?'O rival marcou!':'Acertou! +1';this.feedbackTime=1;
      }
      b.x=wrap(b.x+dx,W);b.y=wrap(b.y+dy,H);b.life-=dt;if(b.life<=0)dead.add(b);
    }
    this.bullets=this.bullets.filter(b=>!dead.has(b));this.score=this.scores[0];
    if(this.remaining<=1e-8){this.remaining=0;this.done=true;this.won=this.score>this.scores[1];this.draw=this.score===this.scores[1];this.message=`Placar final: ${this.score} a ${this.scores[1]}.`;}
  }
}
