import {W,H,wrap,delta,distance,Random,segmentCircle,rockVertices,segmentPolygon,circlePolygon} from './common.js';
export class Asteroids {
 constructor({seed=1979,variant='classic'}={}){Object.assign(this,{rng:new Random(seed),variant,time:0,score:0,lives:4,wave:1,extra:5000,done:false,won:false,dead:0,invulnerable:2,cooldown:0,hyperCooldown:0,hyperHeld:false,events:[],bullets:[],enemyBullets:[],rocks:[],effects:[],ufo:null,ufoClock:14,transition:0,serial:0});this.ship={x:180,y:225,vx:0,vy:0,angle:-Math.PI/2,thrust:false};this.newWave();}
 rock(x,y,size,angle){const speed=(36+(3-size)*22+this.wave*3)*(this.variant==='expert'?1.3:1),r=[0,10,19,34][size];return {id:this.serial++,x:wrap(x,W),y:wrap(y,H),size,r,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle:this.rng.next()*6.28,spin:(this.rng.next()-.5)*.9,shape:Array.from({length:10},()=>.7+this.rng.next()*.3)};}
 newWave(){this.rocks=Array.from({length:Math.min(11,3+this.wave)},()=>{const x=this.rng.next()<.5?14:W-14,y=this.rng.next()*H;return this.rock(x,y,3,this.rng.next()*6.28);});this.events.push('wave');}
 addScore(n){this.score+=n;while(this.score>=this.extra){this.lives++;this.extra+=5000;this.events.push('bonus');}}
 destroy(rock,award=true){const index=this.rocks.indexOf(rock);if(index<0)return;this.rocks.splice(index,1);if(award)this.addScore([0,100,50,20][rock.size]);if(rock.size>1){const a=Math.atan2(rock.vy,rock.vx);for(const d of [-.65,.65])this.rocks.push(this.rock(rock.x,rock.y,rock.size-1,a+d));}this.effects.push({x:rock.x,y:rock.y,life:.38,r:rock.r});this.events.push('destroy');}
 lose(){if(this.dead||this.invulnerable||this.done)return;this.lives--;this.dead=1.2;this.effects.push({...this.ship,life:.8,r:20});this.events.push('hit');if(!this.lives){this.done=true;this.message='Sua última nave foi destruída.';}}
 safeRespawn(){const points=[{x:180,y:225},{x:90,y:112},{x:270,y:112},{x:90,y:338},{x:270,y:338}];const best=points.reduce((a,b)=>this.clearance(a)>this.clearance(b)?a:b);Object.assign(this.ship,{...best,vx:0,vy:0,angle:-Math.PI/2,thrust:false});this.invulnerable=1.5;}
 clearance(p){return Math.min(...this.rocks.map(r=>distance(p,r)-r.r),200);}
 step(dt,input={}){
  this.events=[];if(this.done)return;this.time+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);this.invulnerable=Math.max(0,this.invulnerable-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.hyperCooldown=Math.max(0,this.hyperCooldown-dt);
  const s=this.ship;
  if(this.dead>0){this.dead=Math.max(0,this.dead-dt);if(!this.dead)this.safeRespawn();}else{
   s.angle+=(Number(!!input.right)-Number(!!input.left))*3.8*dt;s.thrust=!!input.up;
   if(s.thrust){s.vx+=Math.cos(s.angle)*135*dt;s.vy+=Math.sin(s.angle)*135*dt;}
   const speed=Math.hypot(s.vx,s.vy);if(speed>230){s.vx*=230/speed;s.vy*=230/speed;}
   // Momentum persists after releasing thrust. No automatic aiming or braking.
   s.x=wrap(s.x+s.vx*dt,W);s.y=wrap(s.y+s.vy*dt,H);
   if(input.action&&!this.cooldown&&this.bullets.length<4){this.bullets.push({x:wrap(s.x+Math.cos(s.angle)*13,W),y:wrap(s.y+Math.sin(s.angle)*13,H),vx:Math.cos(s.angle)*370+s.vx*.4,vy:Math.sin(s.angle)*370+s.vy*.4,life:.95});this.cooldown=.16;this.events.push('shoot');}
   if(input.down&&!this.hyperHeld&&!this.hyperCooldown){s.x=this.rng.next()*W;s.y=this.rng.next()*H;this.hyperCooldown=2;this.events.push('hyper');/* Deliberately not safe: hyperspace may end inside a rock. */}
  }
  this.hyperHeld=!!input.down;
  for(const r of this.rocks){r.x=wrap(r.x+r.vx*dt,W);r.y=wrap(r.y+r.vy*dt,H);r.angle+=r.spin*dt;}
  for(const b of this.bullets){const dx=b.vx*dt,dy=b.vy*dt;let nearest=null,t=2;for(const r of this.rocks){const hit=segmentPolygon(b.x,b.y,dx,dy,rockVertices(r,b.x+delta(r.x,b.x,W),b.y+delta(r.y,b.y,H)));if(hit!==null&&hit<t){nearest=r;t=hit;}}if(nearest){this.destroy(nearest);b.life=0;}else if(this.ufo&&segmentCircle(b.x,b.y,dx,dy,b.x+delta(this.ufo.x,b.x,W),b.y+delta(this.ufo.y,b.y,H),this.ufo.small?11:18)!==null){this.addScore(this.ufo.small?1000:200);this.effects.push({...this.ufo,life:.4,r:20});this.ufo=null;b.life=0;this.events.push('destroy');}b.x=wrap(b.x+dx,W);b.y=wrap(b.y+dy,H);b.life-=dt;}
  this.bullets=this.bullets.filter(b=>b.life>0);
  if(this.variant==='expert'){
   this.ufoClock-=dt;if(this.ufoClock<=0&&!this.ufo){this.ufo={x:-20,y:60+this.rng.next()*330,dir:1,small:this.score>=7500,fire:1.1,age:0};this.ufoClock=15+this.rng.next()*7;}
   if(this.ufo){const u=this.ufo;u.age+=dt;u.x+=55*dt;u.y=wrap(u.y+Math.sin(u.age*2)*25*dt,H);u.fire-=dt;if(u.fire<=0){const aim=u.small?Math.atan2(delta(s.y,u.y,H),delta(s.x,u.x,W))+(this.rng.next()-.5)*.2:this.rng.next()*6.28;this.enemyBullets.push({x:u.x,y:u.y,vx:Math.cos(aim)*170,vy:Math.sin(aim)*170,life:2.4});u.fire=u.small?.8:1.4;}if(u.x>W+25)this.ufo=null;}
  }
  for(const b of this.enemyBullets){const dx=b.vx*dt,dy=b.vy*dt;if(segmentCircle(b.x,b.y,dx,dy,b.x+delta(s.x,b.x,W),b.y+delta(s.y,b.y,H),9)!==null){b.life=0;this.lose();}b.x=wrap(b.x+dx,W);b.y=wrap(b.y+dy,H);b.life-=dt;}this.enemyBullets=this.enemyBullets.filter(b=>b.life>0);
  if(!this.dead&&!this.invulnerable){const rock=this.rocks.find(r=>distance(r,s)<r.r+7&&circlePolygon(s.x,s.y,7,rockVertices(r,s.x+delta(r.x,s.x,W),s.y+delta(r.y,s.y,H))));if(rock){this.destroy(rock);this.lose();}else if(this.ufo&&distance(this.ufo,s)<(this.ufo.small?18:25))this.lose();}
  if(!this.rocks.length&&!this.ufo){if(!this.transition)this.transition=1.5;this.transition-=dt;if(this.transition<=0){this.transition=0;this.wave++;this.newWave();}}else this.transition=0;
 }
}
