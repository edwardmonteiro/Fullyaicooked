import {W,H,clamp,Random,segmentBox} from './common.js';
// Single-player 2600 rules: 36 targets, 5..30 per row, 200-point command ship.
export class Invaders {
 constructor({seed=1980,variant='classic'}={}){Object.assign(this,{rng:new Random(seed),variant,time:0,score:0,lives:3,wave:1,x:180,done:false,won:false,dead:0,invulnerable:0,shot:null,bombs:[],ufo:null,ufoClock:12,moveClock:0,bombClock:.9,animation:0,effects:[],events:[],transition:0});this.newWave();}
 newWave(){this.aliens=Array.from({length:36},(_,i)=>({col:i%6,row:Math.floor(i/6),alive:true}));this.formation={x:65,y:62+Math.min(7,this.wave-1)*14,dir:1};this.moveClock=0;this.bombs=[];this.shot=null;this.shields=[];for(const x of [57,153,249])for(let y=0;y<8;y++)for(let c=0;c<14;c++){if((y<2&&(c<2-y||c>11+y))||(y>4&&c>=5&&c<=8))continue;this.shields.push({x:x+c*4,y:350+y*4,alive:true});}this.events.push('wave');}
 get remaining(){return this.aliens.filter(a=>a.alive).length;}
 get interval(){return Math.max(.032,.06+this.remaining*.014-Math.min(7,this.wave-1)*.012);}
 position(a){return {x:this.formation.x+a.col*38,y:this.formation.y+a.row*29};}
 lose(){if(this.dead||this.invulnerable||this.done)return;this.lives--;this.dead=1.1;this.shot=null;this.bombs=[];this.events.push('hit');if(!this.lives){this.done=true;this.message='Seu canhão foi atingido três vezes.';}}
 shieldHit(b,dy){
  let target=null,t=2;for(const s of this.shields){if(!s.alive)continue;const hit=segmentBox(b.x,b.y,0,dy,s.x-1,s.y-2,s.x+5,s.y+6);if(hit&&hit.t<t){target=s;t=hit.t;}}
  if(!target)return false;for(const s of this.shields)if(Math.hypot(s.x-target.x,(s.y-target.y)*.85)<8)s.alive=false;
  this.effects.push({x:target.x,y:target.y,life:.12,type:'shield'});return true;
 }
 step(dt,input={}){
  this.events=[];if(this.done)return;this.time+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  if(this.dead>0){this.dead=Math.max(0,this.dead-dt);if(!this.dead){this.x=180;this.invulnerable=1;}return;}
  if(this.transition>0){this.transition=Math.max(0,this.transition-dt);if(!this.transition){this.wave++;this.newWave();}return;}
  this.invulnerable=Math.max(0,this.invulnerable-dt);this.x=clamp(this.x+(Number(!!input.right)-Number(!!input.left))*185*dt,18,W-18);
  if(Number.isFinite(input.targetX))this.x=clamp(this.x+clamp(input.targetX-this.x,-185*dt,185*dt),18,W-18);
  if(input.action&&!this.shot){this.shot={x:this.x,y:407};this.events.push('shoot');}
  this.moveClock+=dt;
  while(this.moveClock>=this.interval){this.moveClock-=this.interval;const alive=this.aliens.filter(a=>a.alive);const edge=alive.some(a=>{const p=this.position(a);return p.x+this.formation.dir*6<16||p.x+this.formation.dir*6>W-16;});if(edge){this.formation.dir*=-1;this.formation.y+=13;}else this.formation.x+=this.formation.dir*6;this.animation++;this.events.push('march');}
  for(const a of this.aliens){if(!a.alive)continue;const p=this.position(a);for(const s of this.shields)if(s.alive&&Math.abs(s.x-p.x)<14&&Math.abs(s.y-p.y)<12)s.alive=false;if(p.y+10>=411){this.done=true;this.message='Os invasores chegaram à Terra.';return;}}
  this.ufoClock-=dt;if(this.ufoClock<=0&&!this.ufo){const dir=this.rng.next()<.5?1:-1;this.ufo={x:dir>0?-20:W+20,y:25,dir};this.ufoClock=15+this.rng.next()*7;}
  if(this.ufo){this.ufo.x+=this.ufo.dir*62*dt;if(this.ufo.x< -28||this.ufo.x>W+28)this.ufo=null;}
  if(this.shot){const b=this.shot,dy=-420*dt;if(this.shieldHit(b,dy))this.shot=null;else{
   let nearest=null,hitT=2;for(const a of this.aliens){if(!a.alive)continue;const p=this.position(a),h=segmentBox(b.x,b.y,0,dy,p.x-12,p.y-9,p.x+12,p.y+9);if(h&&h.t<hitT){hitT=h.t;nearest=a;}}
   if(nearest){nearest.alive=false;this.score+=(6-nearest.row)*5;this.effects.push({...this.position(nearest),life:.22,type:'alien'});this.events.push('destroy');this.shot=null;}
   else if(this.ufo&&segmentBox(b.x,b.y,0,dy,this.ufo.x-17,17,this.ufo.x+17,33)){this.score+=200;this.effects.push({x:this.ufo.x,y:25,life:.7,type:'200'});this.ufo=null;this.shot=null;this.events.push('bonus');}
   else {b.y+=dy;if(b.y<0)this.shot=null;}
  }}
  this.bombClock-=dt;if(this.bombClock<=0&&this.bombs.length<3){const bottom=[];for(let col=0;col<6;col++){const a=this.aliens.filter(a=>a.alive&&a.col===col).at(-1);if(a)bottom.push(a);}if(bottom.length){const aimed=this.rng.next()<.4,best=aimed?bottom.reduce((a,b)=>Math.abs(this.position(a).x-this.x)<Math.abs(this.position(b).x-this.x)?a:b):bottom[Math.floor(this.rng.next()*bottom.length)];const p=this.position(best);this.bombs.push({x:p.x,y:p.y+10,baseX:p.x,age:0});}this.bombClock=Math.max(.28,1.1-this.wave*.05-this.rng.next()*.35);}
  for(const b of this.bombs){b.age+=dt;const dy=(this.variant==='fast'?220:130+Math.min(55,this.wave*5))*dt;if(this.variant==='fast')b.x=b.baseX+Math.sin(b.age*8)*10;if(this.shieldHit(b,dy))b.dead=true;else if(segmentBox(b.x,b.y,0,dy,this.x-12,405,this.x+12,423)){b.dead=true;this.lose();}else b.y+=dy;}
  this.bombs=this.bombs.filter(b=>!b.dead&&b.y<H);
  if(!this.remaining){this.transition=1.4;this.bombs=[];this.shot=null;this.events.push('clear');}
 }
}
