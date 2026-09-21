import {clamp, overlap, Random} from './common.js';

export const STORE_WIDTH = 1152;
export const floorY = floor => 226 - floor * 56;
export const escalatorX = floor => floor % 2 === 0 ? STORE_WIDTH - 42 : 42;
export function bodyBox(actor) { const h = actor.duck ? 10 : 24; return {x:actor.x-6,y:floorY(actor.floor)+actor.z-h,w:12,h}; }
export function obstacleBox(obstacle, time) {
  const base = floorY(obstacle.floor);
  if(obstacle.type==='plane') return {x:obstacle.x-13,y:base-25,w:26,h:8};
  if(obstacle.type==='ball') return {x:obstacle.x-6,y:base-12-Math.abs(Math.sin(time*3+obstacle.phase))*obstacle.bounce,w:12,h:12};
  if(obstacle.type==='radio') return {x:obstacle.x-8,y:base-17,w:16,h:17};
  return {x:obstacle.x-11,y:base-15,w:22,h:15};
}
export function elevatorAt(time) {
  const stops=[0,1,2,1],period=2.9,slot=Math.floor(time/period)%4,phase=time%period;
  const from=stops[slot],to=stops[(slot+1)%4];
  return {floor:from,open:phase<1.55,position:phase<1.55?from:from+(to-from)*(phase-1.55)/1.35,phase};
}

export class Keystone {
  constructor({seed=1983,variant='classic'}={}) {
    this.rng=new Random(seed);this.variant=variant;this.time=0;this.score=0;this.lives=4;this.level=1;this.arrests=0;
    this.done=false;this.won=false;this.events=[];this.message='';this.feedback='';this.feedbackTime=0;
    this.transition=0;this.nextLife=10000;this.jumpHeld=false;this.penalties=0;this.elevatorRides=0;this.escalatorRides=0;this.loot=0;
    this.setup();
  }
  setup() {
    this.remaining=50;this.clock=0;this.elevator=elevatorAt(0);this.liftX=[576,480,672][(this.level-1)%3];
    this.player={x:38,floor:0,z:0,vz:0,duck:false,facing:1,ride:null,inLift:false,immune:1,stun:0};
    this.thief={x:[480,820,640][(this.level-1)%3],floor:1,z:0,duck:false,facing:-1,ride:null};
    this.camera=0;this.obstacles=[];this.pickups=[];
    const n=Math.min(6,2+Math.floor((this.level-1)/2)),speed=27+Math.min(this.level,16)*2.8;
    for(let floor=0;floor<4;floor++){
      for(let i=0;i<n;i++){
        let type=i%3===0?'radio':i%3===1?'cart':'ball';
        if(this.level>=3&&i===n-1)type='plane';
        // Wide spaces allow a complete running jump between successive hazards.
        let x=230+i*(780/n)+floor*39;
        if(Math.abs(x-this.liftX)<56)x+=90;
        this.obstacles.push({x,floor,type,dir:floor%2?1:-1,speed:type==='radio'?0:type==='plane'?100+this.level*3:speed,
          phase:i*1.7+floor,bounce:Math.min(38,5+this.level*2.6),touch:0});
      }
      this.pickups.push({x:154+floor*133,floor,type:floor%2?'case':'bag',taken:false});
    }
    this.jumpHeld=false;
  }
  addScore(points) {
    this.score+=points;
    while(this.score>=this.nextLife){this.nextLife+=10000;if(this.lives<4){this.lives++;this.events.push('bonus');}}
  }
  lose(reason) {
    this.lives--;this.events.push('lost');this.feedback=reason;this.feedbackTime=1.6;
    if(this.lives<=0){this.done=true;this.message=`${this.arrests} prisões. ${reason}`;}
    else {this.transition=1.6;this.nextLevel=false;}
  }
  arrest() {
    const multiplier=this.level<=8?100:this.level<=16?200:300,points=Math.floor(this.remaining)*multiplier;
    this.arrests++;this.addScore(points);this.events.push('arrest');this.feedback=`Ladrão capturado! +${points}`;this.feedbackTime=1.7;
    this.transition=1.7;this.nextLevel=true;
  }
  rideStairs(actor) {
    if(actor.floor>=3||actor.ride||actor.inLift)return;
    const x=escalatorX(actor.floor);
    if(Math.abs(actor.x-x)<13){actor.ride={from:actor.floor,to:actor.floor+1,x,progress:clamp(-actor.z/56,0,.45)};actor.z=0;actor.vz=0;
      if(actor===this.player){this.escalatorRides++;this.events.push('stairs');}}
  }
  moveRide(actor,dt) {
    const r=actor.ride;r.progress=Math.min(1,r.progress+dt/1.15);actor.x=r.x+(r.from%2===0?-1:1)*32*r.progress;
    if(r.progress===1){actor.floor=r.to;actor.ride=null;actor.facing=actor.floor%2?-1:1;}
  }
  tick(dt,input={}) {
    if(this.done)return;this.events=[];this.time+=dt;this.feedbackTime=Math.max(0,this.feedbackTime-dt);
    if(this.transition>0){this.transition=Math.max(0,this.transition-dt);if(!this.transition){if(this.nextLevel)this.level++;this.setup();}return;}
    this.clock+=dt;this.remaining=Math.max(0,this.remaining-dt);this.elevator=elevatorAt(this.clock);
    if(!this.remaining){this.lose('O tempo acabou.');return;}
    const p=this.player,t=this.thief,lift=this.elevator;
    p.immune=Math.max(0,p.immune-dt);p.stun=Math.max(0,p.stun-dt);
    const jumping=Boolean(input.action)&&!this.jumpHeld;this.jumpHeld=Boolean(input.action);
    if(p.ride)this.moveRide(p,dt);
    else if(p.inLift){
      p.x=this.liftX;p.floor=lift.position;
      if(lift.open&&input.down){p.inLift=false;p.floor=lift.floor;p.immune=.3;this.events.push('lift');}
    }else{
      p.duck=Boolean(input.down)&&p.z===0;
      if(!p.stun){
        const dir=(input.right?1:0)-(input.left?1:0);if(dir)p.facing=dir;
        p.x=clamp(p.x+dir*(p.duck?0:108)*dt,17,STORE_WIDTH-17);
        if(jumping&&p.z===0&&!p.duck){p.vz=-184;this.events.push('jump');}
        if(input.up&&p.z===0&&Math.abs(p.x-this.liftX)<19&&lift.open&&lift.floor===p.floor){
          p.inLift=true;p.x=this.liftX;p.duck=false;this.elevatorRides++;this.events.push('lift');
        }
      }
      p.vz+=640*dt;p.z+=p.vz*dt;if(p.z>=0){p.z=0;p.vz=0;}
      this.rideStairs(p);
    }
    if(t.ride)this.moveRide(t,dt);
    else{
      const dir=t.floor%2===1?-1:1;t.facing=dir;
      // The thief keeps advancing while Kelly waits for the elevator.
      t.x+=dir*(35+Math.min(this.level,16)*2.5)*dt;
      if(t.floor===3){if(t.x<10){this.lose('O ladrão escapou pelo telhado.');return;}}
      else this.rideStairs(t);
    }
    for(const o of this.obstacles){
      o.touch=Math.max(0,o.touch-dt);o.x+=o.dir*o.speed*dt;
      if(o.x<-35)o.x=STORE_WIDTH+35;if(o.x>STORE_WIDTH+35)o.x=-35;
      if(!p.inLift&&!p.ride&&!p.immune&&!o.touch&&p.floor===o.floor&&overlap(bodyBox(p),obstacleBox(o,this.clock))){
        o.touch=1.2;p.immune=1.15;p.stun=.32;this.penalties++;
        if(o.type==='plane'){this.lose('Você foi atingido por um avião.');return;}
        this.remaining=Math.max(0,this.remaining-9);this.events.push('hit');this.feedback='Colisão: −9 segundos';this.feedbackTime=1.1;
        if(!this.remaining){this.lose('O tempo acabou.');return;}
      }
    }
    if(!p.inLift&&!p.ride){
      for(const item of this.pickups){if(!item.taken&&item.floor===p.floor&&Math.abs(item.x-p.x)<15&&p.z>-14){item.taken=true;this.addScore(50);this.loot++;this.events.push('pickup');}}
      if(!t.ride&&p.floor===t.floor&&Math.abs(p.x-t.x)<13&&p.z>-20){this.arrest();}
    }
    this.camera=clamp(p.x-155,0,STORE_WIDTH-384);
  }
}
