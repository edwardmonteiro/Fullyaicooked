// Deterministic, fixed-step game rules. Rendering and device input live separately.
export const WIDTH = 360, HEIGHT = 576;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const CONFIG = {
  'starfall-patrol': { title:'Starfall Patrol', accent:'#7be3ea', stages:['Outer orbit', 'Crimson fleet', 'The last sentinel'], hint:'DRAG TO FLY · AUTO FIRE', instructions:'Drag your ship to dodge. Firing is automatic. Collect power cells and defeat the sentinel. Pulse clears danger around you.', action:'Pulse', kind:0 },
  'sunset-rider': { title:'Sunset Rider', accent:'#ffd08b', stages:['Coastal escape', 'Golden canyon', 'Last light'], hint:'SWIPE TO STEER', instructions:'Swipe or tap a lane to steer. Slip past traffic and collect energy. Hold Turbo on a clear stretch. Reach all three checkpoints.', action:'Turbo', kind:1 },
  'sky-bastion': { title:'Sky Bastion', accent:'#a9bdff', stages:['First contact', 'Split horizon', 'Meteor storm'], hint:'TAP TO INTERCEPT', instructions:'Tap ahead of a missile to intercept it. Explosions trigger chain reactions. Protect at least one city through every wave. Energy recharges automatically.', action:'EMP', kind:2 }
};
class Game {
  constructor(level = 0) { this.level = clamp(Math.floor(level) || 0,0,2); this.time=0; this.score=0; this.done=false; this.won=false; this.medal=0; this.events=[]; this.fx=[]; this.seed=7831 + this.level*317; this.combo=0; }
  random() { this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0; return this.seed/4294967296; }
  event(type,x=180,y=280) { this.events.push(type); this.fx.push({type,x,y,age:0}); }
  clock(dt) { this.time+=dt; for(const f of this.fx) f.age+=dt; this.fx=this.fx.filter(f=>f.age<.8); }
  finish(won,message,medal=1) { if(this.done)return; this.done=true;this.won=won;this.message=message;this.medal=won?medal:0;this.event(won?'win':'end'); }
}
export class Starfall extends Game {
  constructor(level=0) { super(level);this.x=180;this.y=482;this.hull=3;this.invulnerable=0;this.shield=0;this.power=0;this.charges=2;this.pulse=0;this.shot=0;this.enemies=[];this.bullets=[];this.shots=[];this.pickups=[];this.nextWave=1;this.wave=0;this.kills=0;this.boss=null;this.phase='patrol';this.duration=38+this.level*7;this.damage=0; }
  hit() { if(this.invulnerable>0||this.done)return; if(this.shield>0){this.shield=0;this.invulnerable=.8;this.event('shield',this.x,this.y);return;} this.hull--;this.damage++;this.combo=0;this.invulnerable=1.8;this.event('hit',this.x,this.y);if(this.hull<=0)this.finish(false,'Ship lost. Keep moving through the gaps and save a pulse for danger.'); }
  addEnemy(x,y,kind) { this.enemies.push({x,y,home:x,age:0,kind,hp:kind===2?4:kind===1?2:1,fire:1.5+this.random(),phase:this.random()*6.28}); }
  spawnWave() { const pattern=this.wave++%5;
    if(pattern===0)for(let i=0;i<5;i++)this.addEnemy(52+i*64,-30-Math.abs(2-i)*27,0);
    if(pattern===1)for(let i=0;i<4;i++)this.addEnemy(60+i*78,-30-i*48,1);
    if(pattern===2){this.addEnemy(94,-36,2);this.addEnemy(266,-36,2);}
    if(pattern===3)for(let i=0;i<5;i++)this.addEnemy(i%2?275:85,-35-i*45,0);
    if(pattern===4)for(let i=0;i<3;i++)this.addEnemy(82+i*98,-32-i*45,i===1?2:1);
  }
  enemyShot(e,fan=0,speed=112) { const a=Math.atan2(this.y-e.y,this.x-e.x);for(let i=-fan;i<=fan;i++)this.bullets.push({x:e.x,y:e.y+12,vx:Math.cos(a+i*.2)*speed,vy:Math.sin(a+i*.2)*speed,r:4}); }
  tick(dt,input={}) {
    if(this.done)return;this.clock(dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.shield=Math.max(0,this.shield-dt);this.power=Math.max(0,this.power-dt);this.pulse=Math.max(0,this.pulse-dt);
    const vx=(input.right?1:0)-(input.left?1:0),vy=(input.down?1:0)-(input.up?1:0);
    const tx=Number.isFinite(input.targetX)?input.targetX:this.x+vx*260*dt,ty=Number.isFinite(input.targetY)?input.targetY:this.y+vy*260*dt;
    this.x=clamp(this.x+clamp(tx-this.x,-340*dt,340*dt),22,338);this.y=clamp(this.y+clamp(ty-this.y,-340*dt,340*dt),170,536);
    if(input.action&&this.charges>0){this.charges--;this.pulse=.55;this.bullets=[];for(const e of this.enemies)e.hp-=4;if(this.boss)this.boss.hp-=32;this.invulnerable=Math.max(this.invulnerable,.7);this.event('pulse',this.x,this.y);}
    this.shot-=dt;if(this.shot<=0){this.shot+=this.power>0?.14:.19;for(const offset of this.power>0?[-10,10]:[0])this.shots.push({x:this.x+offset,y:this.y-23});this.events.push('shot');}
    if(this.time<this.duration){this.nextWave-=dt;if(this.nextWave<=0){this.spawnWave();this.nextWave=3.9-this.level*.35;}}
    if(this.time>=this.duration&&!this.boss){this.enemies=[];this.bullets=[];this.phase='sentinel';this.boss={x:180,y:-66,hp:135+this.level*40,maxHp:135+this.level*40,fire:2,age:0};this.hull=Math.min(3,this.hull+1);this.charges=Math.min(3,this.charges+1);this.shield=4;this.event('warning',180,110);}
    for(const e of this.enemies){e.age+=dt;e.y+=(e.kind===2?43:67+this.level*9)*dt;e.x=clamp(e.home+Math.sin(e.age*(e.kind===1?2:1)+e.phase)*(e.kind===1?32:15),24,336);e.fire-=dt;if(e.fire<=0&&e.y>18&&e.y<this.y-60){this.enemyShot(e,e.kind===2?1:0,100+this.level*16);e.fire=2.5-this.level*.25;}}
    if(this.boss){const b=this.boss;b.age+=dt;b.y=Math.min(92,b.y+75*dt);b.x=180+Math.sin(b.age*.85)*108;b.fire-=dt;if(b.fire<=0&&b.y>60){this.enemyShot(b,1+this.level,104+this.level*12);b.fire=1.35-this.level*.17;}}
    for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(Math.hypot(b.x-this.x,b.y-this.y)<12){b.dead=true;this.hit();}}
    for(const b of this.shots){b.y-=580*dt;for(const e of this.enemies){if(!b.dead&&e.hp>0&&Math.abs(b.x-e.x)<(e.kind===2?23:18)&&Math.abs(b.y-e.y)<20){e.hp--;b.dead=true;this.event('spark',b.x,b.y);}}if(!b.dead&&this.boss&&Math.abs(b.x-this.boss.x)<43&&Math.abs(b.y-this.boss.y)<30){this.boss.hp-=3;b.dead=true;this.event('spark',b.x,b.y);}}
    for(const e of this.enemies){if(e.hp<=0){this.kills++;this.combo++;this.score+=100+Math.min(10,this.combo)*10;this.event('burst',e.x,e.y);if(this.kills%7===0)this.pickups.push({x:e.x,y:e.y,type:this.kills%14===0?'shield':'power'});}else if(Math.abs(e.x-this.x)<24&&Math.abs(e.y-this.y)<31){e.hp=0;e.dead=true;this.hit();}}
    this.enemies=this.enemies.filter(e=>e.hp>0&&e.y<620&&!e.dead);
    for(const p of this.pickups){p.y+=80*dt;if(Math.hypot(p.x-this.x,p.y-this.y)<30){p.dead=true;if(p.type==='shield')this.shield=12;else this.power=9;this.score+=150;this.event('pickup',p.x,p.y);}}
    this.pickups=this.pickups.filter(p=>!p.dead&&p.y<610);this.shots=this.shots.filter(b=>!b.dead&&b.y>-30);this.bullets=this.bullets.filter(b=>!b.dead&&b.y<610&&b.y>-70&&b.x>-30&&b.x<390);
    if(this.boss?.hp<=0&&!this.done){this.score+=2500+this.hull*500;this.event('burst',this.boss.x,this.boss.y);this.finish(true,'Sentinel defeated. The flight path is clear.',this.damage===0?3:this.hull>=2?2:1);}
  }
  get fraction(){return this.boss?1-clamp(this.boss.hp/this.boss.maxHp,0,1):clamp(this.time/this.duration,0,1)*.85;}
  get detail(){return this.boss?'SENTINEL · '+Math.max(0,Math.ceil(this.boss.hp)):'SECTOR '+(this.level+1)+' · '+this.kills+' TARGETS';}
}
export const LANES=[104,180,256];
export class Rider extends Game {
  constructor(level=0){super(level);this.x=180;this.lane=1;this.y=481;this.hull=3;this.energy=100;this.invulnerable=0;this.slow=0;this.boosting=false;this.distance=0;this.speed=215;this.length=11200+this.level*1700;this.traffic=[];this.coins=[];this.rows=0;this.nextRow=350;this.checkpoint=0;this.hits=0;this.near=0;this.lastSafe=1;this.rowHistory=[];}
  row(){
    // A traversable lane is guaranteed in every row. A double-blocked row never
    // jumps directly between both edges, giving a finger enough time to steer.
    let safe=(this.rows*2+this.level)%3;if(Math.abs(safe-this.lastSafe)===2)safe=1;
    const lanes=[0,1,2].filter(n=>n!==safe);const double=this.rows%4!==0;
    for(const lane of double?lanes:[lanes[this.rows%2]])this.traffic.push({x:LANES[lane],lane,z:this.distance+730,type:(this.rows+lane)%2,passed:false,near:false});
    for(let i=0;i<3;i++)this.coins.push({x:LANES[safe],z:this.distance+800+i*46});
    this.rowHistory.push({distance:this.distance,safe});this.lastSafe=safe;this.rows++;
  }
  tick(dt,input={}){
    if(this.done)return;this.clock(dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.slow=Math.max(0,this.slow-dt);
    if(Number.isFinite(input.lane))this.lane=clamp(Math.round(input.lane),0,2);
    if(Number.isFinite(input.targetX))this.lane=clamp(Math.round((input.targetX-LANES[0])/76),0,2);
    if(input.leftStep)this.lane=Math.max(0,this.lane-1);if(input.rightStep)this.lane=Math.min(2,this.lane+1);
    this.x+=clamp(LANES[this.lane]-this.x,-520*dt,520*dt);
    this.boosting=!!input.action&&this.energy>0&&this.slow<=0;this.energy=clamp(this.energy+(this.boosting?-27:10)*dt,0,100);
    const desired=this.slow>0?100:this.boosting?330:215+this.level*12;this.speed+=(desired-this.speed)*Math.min(1,dt*5);this.distance+=this.speed*dt;this.score+=this.speed*dt*.07;
    if(this.distance>=this.nextRow&&this.distance<this.length-760){this.row();this.nextRow+=510-this.level*25;}
    for(const car of this.traffic){const dy=car.z-this.distance;
      if(!car.passed&&Math.abs(dy)<76&&Math.abs(car.x-this.x)<29&&this.invulnerable<=0){this.hull--;this.hits++;this.combo=0;this.slow=1.05;this.invulnerable=1.75;car.passed=true;this.event('hit',this.x,this.y);if(this.hull<=0)this.finish(false,'Ride ended. Watch the open lane and use Turbo on clear road.');}
      if(!car.passed&&dy<-82){car.passed=true;this.score+=80;this.combo++;if(Math.abs(car.x-this.x)<67){this.near++;this.score+=120;this.energy=clamp(this.energy+12,0,100);this.event('near',this.x,this.y-50);}}
    }
    for(const c of this.coins)if(Math.abs(c.z-this.distance)<24&&Math.abs(c.x-this.x)<29){c.dead=true;this.score+=60;this.energy=clamp(this.energy+6,0,100);this.event('pickup',c.x,this.y);}
    this.coins=this.coins.filter(c=>!c.dead&&c.z>this.distance-90);this.traffic=this.traffic.filter(c=>c.z>this.distance-160);
    if(this.distance>=this.length*(this.checkpoint+1)/3){this.checkpoint++;if(this.checkpoint<3){this.hull=Math.min(3,this.hull+1);this.score+=500;this.event('checkpoint',180,180);}}
    if(this.distance>=this.length&&!this.done){this.score+=2000+this.hull*350;this.finish(true,'Finish line reached. Three checkpoints, one clean escape.',this.hits===0?3:this.hits<=2?2:1);}
  }
  get fraction(){return clamp(this.distance/this.length,0,1);}
  get detail(){return 'CHECKPOINT '+Math.min(3,this.checkpoint+1)+'/3 · '+Math.round(this.speed*.65)+' KM/H';}
}
export class Bastion extends Game {
  constructor(level=0){super(level);this.cities=[{x:65,hp:2},{x:180,hp:2},{x:295,hp:2}];this.energy=6;this.missiles=[];this.interceptors=[];this.blasts=[];this.wave=0;this.waves=5+this.level;this.spawned=0;this.nextSpawn=2;this.intermission=0;this.fireCooldown=0;this.emp=0;this.aim={x:180,y:260};this.total=0;this.stopped=0;this.chain=0;this.bestChain=0;this.damage=0;}
  get hull(){return this.cities.filter(c=>c.hp>0).length;}
  launch(x,y){if(this.done||this.energy<1||this.fireCooldown>0||!Number.isFinite(x)||!Number.isFinite(y))return false;this.energy-=1;this.fireCooldown=.18;const tx=clamp(x,12,348),ty=clamp(y,24,510);const city=this.cities.filter(c=>c.hp>0).sort((a,b)=>Math.abs(a.x-tx)-Math.abs(b.x-tx))[0];if(!city)return false;this.interceptors.push({x:city.x+9,y:485,tx,ty});this.event('launch',city.x+9,485);return true;}
  explode(x,y,chain=0){this.blasts.push({x,y,age:0,r:0,chain});this.event('burst',x,y);}
  spawn(){const alive=this.cities.map((c,i)=>c.hp>0?i:-1).filter(i=>i>=0);const target=alive[(this.spawned+this.wave)%alive.length];const x=28+this.random()*304;this.missiles.push({x,y:-16,ox:x,oy:-16,target,speed:42+this.wave*4+this.level*6,split:this.level>0&&(this.spawned+this.wave)%4===2,splitDone:false});this.spawned++;this.total++;}
  tick(dt,input={}){
    if(this.done)return;this.clock(dt);this.energy=Math.min(6,this.energy+dt*(1.1+this.level*.1));this.fireCooldown=Math.max(0,this.fireCooldown-dt);this.emp=Math.max(0,this.emp-dt);
    this.aim.x=clamp(this.aim.x+((input.right?1:0)-(input.left?1:0))*240*dt,12,348);this.aim.y=clamp(this.aim.y+((input.down?1:0)-(input.up?1:0))*240*dt,24,510);
    if(input.target){this.aim={x:clamp(input.target.x,12,348),y:clamp(input.target.y,24,510)};this.launch(this.aim.x,this.aim.y);}
    if(input.fire)this.launch(this.aim.x,this.aim.y);
    if(input.action&&this.emp===0&&this.energy>=3){this.energy-=3;this.emp=12;for(const x of [65,180,295])this.explode(x,390,0);this.event('pulse',180,390);}
    if(this.intermission>0){this.intermission-=dt;if(this.intermission<=0){this.wave++;this.spawned=0;this.nextSpawn=.7;this.energy=6;this.event('checkpoint',180,190);}}
    else if(this.spawned<7+this.wave){this.nextSpawn-=dt;if(this.nextSpawn<=0){this.spawn();this.nextSpawn=Math.max(.62,1.5-this.wave*.1-this.level*.12);}}
    for(const i of this.interceptors){const d=Math.hypot(i.tx-i.x,i.ty-i.y),step=590*dt;if(d<=step){i.dead=true;this.explode(i.tx,i.ty);}else{i.x+=(i.tx-i.x)/d*step;i.y+=(i.ty-i.y)/d*step;}}
    for(const b of this.blasts){b.age+=dt;b.r=b.age<.2?b.age/.2*52:b.age<.9?52:(1.35-b.age)/.45*52;}
    const children=[];
    for(const m of this.missiles){const city=this.cities[m.target],dx=city.x-m.x,dy=550-m.y,d=Math.hypot(dx,dy);m.x+=dx/d*m.speed*dt;m.y+=dy/d*m.speed*dt;
      const blast=this.blasts.find(b=>b.r>0&&Math.hypot(m.x-b.x,m.y-b.y)<b.r+3);
      if(blast){m.dead=true;this.stopped++;const chain=blast.chain+1;this.bestChain=Math.max(this.bestChain,chain);this.score+=100+Math.min(5,chain)*40;this.explode(m.x,m.y,chain);continue;}
      if(m.split&&!m.splitDone&&m.y>=202){m.splitDone=true;m.dead=true;const targets=this.cities.map((c,i)=>c.hp>0?i:-1).filter(i=>i>=0);for(const idx of [...new Set([targets[0],targets[targets.length-1]])])children.push({x:m.x,y:m.y,ox:m.x,oy:m.y,target:idx,speed:m.speed*1.12,split:false});this.event('warning',m.x,m.y);}
      else if(m.y>=543){m.dead=true;if(city.hp>0){city.hp--;this.damage++;this.event('hit',city.x,548);}if(this.hull===0)this.finish(false,'The cities fell. Aim ahead of missiles and let explosions chain together.');}
    }
    this.missiles=this.missiles.filter(m=>!m.dead).concat(children);this.interceptors=this.interceptors.filter(i=>!i.dead);this.blasts=this.blasts.filter(b=>b.age<1.35);
    if(!this.done&&this.intermission<=0&&this.spawned>=7+this.wave&&!this.missiles.length){if(this.wave>=this.waves-1){this.score+=this.hull*1200;this.finish(true,'Dawn is here. The cities are safe.',this.damage===0?3:this.hull===3?2:1);}else {this.intermission=2.5;this.score+=this.hull*200;}}
  }
  get fraction(){return clamp((this.wave+this.spawned/(7+this.wave))/this.waves,0,1);}
  get detail(){return this.intermission>0?'WAVE CLEAR · RECHARGING':'WAVE '+(this.wave+1)+'/'+this.waves+' · '+this.stopped+' STOPPED';}
}
export const MODELS={'starfall-patrol':Starfall,'sunset-rider':Rider,'sky-bastion':Bastion};
