import { clamp } from './river.js';
export const ROOM_COUNT = 255, TREASURE_COUNT = 32, TIME_LIMIT = 20 * 60;
const patterns = ['logs','vine','crocodiles','sand','fire','pit','logs','vine','snake','crocodiles','sand','fire'];
export function jungleRoom(index) {
  index = (index + ROOM_COUNT) % ROOM_COUNT;
  return { index, type:patterns[index % patterns.length], ladder:index % 3 === 0 || index % 8 === 3, treasure:index % 8 === 3, value:[2000,3000,4000,5000][Math.floor(index / 8) % 4], wall:index % 7 === 2, phase:(index % 5) * .6 };
}
export function vineAt(time, room) {
  const phase = time * 1.8 + room.phase, angle = Math.sin(phase) * .7;
  return { x:80 + Math.sin(angle) * 70, y:39 + Math.cos(angle) * 70, vx:Math.cos(angle) * Math.cos(phase) * .7 * 1.8 * 70 };
}
export function sandOpen(time, room) { return ((time + room.phase) % 5) < 3.1; }
export function crocOpen(time, room) { return ((time + room.phase) % 3.8) < 1.45; }
export function groundSafe(x, time, room) {
  if (room.type === 'vine') return x < 56 || x > 108;
  if (room.type === 'pit') return x < 63 || x > 94;
  if (room.type === 'sand') return !sandOpen(time,room) || x < 58 || x > 104;
  if (room.type === 'crocodiles') {
    if (x < 52 || x > 116) return true;
    return [56,78,100].some(left => x >= left && x <= left + (crocOpen(time,room) ? 9 : 15));
  }
  return true;
}
export class Pitfall {
  constructor() {
    Object.assign(this,{ roomIndex:0,x:16,y:128,vx:0,vy:0,layer:0,climbing:false,hanging:false,grounded:true,grabArmed:false,face:1,lives:3,score:2000,time:0,remaining:TIME_LIMIT,dead:0,invincible:0,done:false,won:false,jumpHeld:false,grabCooldown:0,entry:1,lastLost:0 });
    this.treasures = new Set(); this.visited = new Set([0]); this.events=[];
  }
  get room() { return jungleRoom(this.roomIndex); }
  lose(reason) {
    if(this.dead || this.done)return;
    this.lives--;this.dead=1;this.reason=reason;this.hanging=false;this.climbing=false;this.events.push('hit');
  }
  transition(direction) {
    this.roomIndex=(this.roomIndex + direction*(this.layer ? 3 : 1) + ROOM_COUNT)%ROOM_COUNT;
    this.visited.add(this.roomIndex);this.x=direction>0 ? 2 : 158;this.entry=direction;this.hanging=false;
    this.events.push('room');
  }
  step(dt,input={}) {
    this.events=[];
    if(this.done)return;
    this.time+=dt;this.remaining=Math.max(0,this.remaining-dt);
    if(!this.remaining){this.done=true;this.message='Time is up. Find all 32 treasures before the twenty minutes run out.';return;}
    if(this.dead>0){
      this.dead=Math.max(0,this.dead-dt);
      if(this.dead<=0){if(!this.lives){this.done=true;this.message=this.reason;return;}this.x=this.entry>0?12:148;this.y=this.layer?176:128;this.vy=0;this.vx=0;this.grounded=true;this.invincible=1.3;}
      return;
    }
    this.invincible=Math.max(0,this.invincible-dt);this.grabCooldown=Math.max(0,this.grabCooldown-dt);
    const room=this.room, direction=Number(!!input.right)-Number(!!input.left), jump=!!input.action&&!this.jumpHeld;
    this.jumpHeld=!!input.action;
    if(direction)this.face=direction;
    if(this.hanging){
      const vine=vineAt(this.time,room);this.x=vine.x;this.y=vine.y+14;
      if(jump){this.hanging=false;this.vx=clamp(vine.vx*.5,-55,55);this.vy=-96;this.grabCooldown=.5;this.events.push('jump');}
      return;
    }
    if(room.ladder && Math.abs(this.x-26)<7 && ((input.down && this.y>=125)||(input.up&&this.y>128))){
      this.climbing=true;this.x=26;this.vy=0;this.grounded=false;
    }
    if(this.climbing){
      this.y+=((input.down?1:0)-(input.up?1:0))*35*dt;
      if(this.y<=128){this.y=128;this.layer=0;this.climbing=false;this.grounded=true;}
      if(this.y>=176){this.y=176;this.layer=1;this.climbing=false;this.grounded=true;}
      if(jump){this.climbing=false;this.layer=this.y>150?1:0;this.vy=-105;this.vx=direction*46;this.grabArmed=true;}
      return;
    }
    if(jump && this.grounded){this.vy=-130;this.grounded=false;this.grabArmed=true;this.events.push('jump');}
    if(this.grounded)this.vx=direction*46;
    else this.vx+=((direction*46)-this.vx)*Math.min(1,dt*5);
    const beforeX=this.x, beforeY=this.y;
    this.x+=this.vx*dt;
    if(this.layer && room.wall && ((beforeX<76&&this.x>=76)||(beforeX>84&&this.x<=84)))this.x=beforeX;
    this.vy+=370*dt;this.y+=this.vy*dt;
    if(!this.layer && this.grabArmed && !this.grabCooldown && room.type==='vine' && !this.grounded){
      const vine=vineAt(this.time,room);
      if(Math.abs(this.x-vine.x)<8&&Math.abs(this.y-14-vine.y)<15){this.hanging=true;this.grabArmed=false;this.events.push('grab');return;}
    }
    const floor=this.layer?176:128;
    if(beforeY<=floor+.01&&this.y>=floor&&this.vy>=0){
      if(this.layer||groundSafe(this.x,this.time,room)){this.y=floor;this.vy=0;this.grounded=true;}
      else{this.lose(room.type==='crocodiles'?'A crocodile caught you. Land on its back when its jaws open.':'You fell into a pit. Time the jump, or use the swinging vine.');return;}
    }
    if(!this.layer&&this.grounded&&!groundSafe(this.x,this.time,room)){this.lose('The ground opened beneath you. Watch its cycle before crossing.');return;}
    if(this.x>161){this.transition(1);return;}else if(this.x< -1){this.transition(-1);return;}
    if(!this.invincible){
      if(!this.layer && room.type==='logs'){
        const logX=160-((this.time*23+room.index*29)%176);
        if(Math.abs(this.x-logX)<8&&this.y>120){this.score=Math.max(0,this.score-70*dt);if(this.time-this.lastLost>.4){this.events.push('log');this.lastLost=this.time;}}
      }
      if(!this.layer && ['fire','snake'].includes(room.type)&&Math.abs(this.x-89)<8&&this.y>118)this.lose('Jump over the '+room.type+' before it reaches your feet.');
      const scorpionX=80+Math.sin(this.time*.9+room.phase)*36;
      if(this.layer&&!room.wall&&Math.abs(this.x-scorpionX)<7&&this.y>169)this.lose('A scorpion caught you in the tunnel. Jump over it.');
    }
    if(!this.layer&&room.treasure&&!this.treasures.has(room.index)&&Math.abs(this.x-131)<9&&this.y>113&&this.y<=128){
      this.treasures.add(room.index);this.score=Math.floor(this.score)+room.value;this.events.push('treasure');
      if(this.treasures.size===TREASURE_COUNT){this.done=true;this.won=true;this.message='All 32 treasures recovered! The jungle is yours.';}
    }
  }
}
