import {W,clamp,segmentBox} from './common.js';
export const BRICK_COLORS=['#ed706e','#ed706e','#efa24b','#efa24b','#78bf8c','#78bf8c','#e1cd70','#e1cd70'];
// Classic arcade wall: 14 columns, 8 rows; two walls, five balls, 896 maximum.
export class Breakout {
 constructor(){Object.assign(this,{score:0,lives:5,wave:1,x:180,width:58,done:false,won:false,waiting:true,serveHeld:false,hits:0,speed:205,events:[],effects:[],time:0,cleared:0,shrunk:false});this.wall();this.ball={x:180,y:404,vx:0,vy:0,r:3};}
 wall(){this.bricks=Array.from({length:112},(_,i)=>({x:12+(i%14)*24,y:68+Math.floor(i/14)*12,w:24,h:12,row:Math.floor(i/14),alive:true,points:[7,7,5,5,3,3,1,1][Math.floor(i/14)]}));}
 launch(){if(!this.waiting)return;this.waiting=false;this.ball.vx=90*(this.lives%2?1:-1);this.ball.vy=-Math.sqrt(this.speed**2-this.ball.vx**2);this.events.push('serve');}
 velocity(speed){const b=this.ball,ratio=speed/Math.hypot(b.vx,b.vy);b.vx*=ratio;b.vy*=ratio;this.speed=speed;}
 lose(){this.lives--;this.events.push('hit');if(!this.lives){this.done=true;this.message='As cinco bolas terminaram.';return;}this.waiting=true;this.width=58;this.shrunk=false;this.speed=205;this.hits=0;this.ball={x:this.x,y:404,vx:0,vy:0,r:3};}
 step(dt,input={}){
  this.events=[];if(this.done)return;this.time+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  const oldX=this.x;if(Number.isFinite(input.targetX))this.x=clamp(input.targetX,12+this.width/2,348-this.width/2);else this.x=clamp(this.x+(Number(!!input.right)-Number(!!input.left))*330*dt,12+this.width/2,348-this.width/2);
  if(this.waiting){this.ball.x=this.x;this.ball.y=404;if(input.action&&!this.serveHeld)this.launch();this.serveHeld=!!input.action;return;}this.serveHeld=!!input.action;
  const b=this.ball;let left=dt;
  // Swept ball vs expanded rectangles: earliest contact, including corners, no tunneling.
  for(let bounce=0;bounce<10&&left>1e-7;bounce++){
   const dx=b.vx*left,dy=b.vy*left;let hit={t:1.00001},obj=null;
   const choose=(h,o)=>{if(h&&h.t<hit.t-1e-8){hit=h;obj=o;}};
   if(dx<0)choose({t:(15-b.x)/dx,nx:1,ny:0},'wall');if(dx>0)choose({t:(345-b.x)/dx,nx:-1,ny:0},'wall');if(dy<0)choose({t:(17-b.y)/dy,nx:0,ny:1},'ceiling');
   if(dy>0){const t=(407-b.y)/dy,px=oldX+(this.x-oldX)*clamp(1-left/dt+t*left/dt,0,1);if(t>=0&&t<=1&&Math.abs(b.x+dx*t-px)<=this.width/2+b.r)choose({t,nx:0,ny:-1,px},'paddle');}
   for(const brick of this.bricks)if(brick.alive){const h=segmentBox(b.x,b.y,dx,dy,brick.x-b.r,brick.y-b.r,brick.x+brick.w+b.r,brick.y+brick.h+b.r);if(h&&(h.nx||h.ny))choose(h,brick);}
   if(hit.t<0||hit.t>1){b.x+=dx;b.y+=dy;break;}
   b.x+=dx*hit.t;b.y+=dy*hit.t;left*=1-hit.t;
   if(obj==='paddle'){
    this.hits++;if(this.hits===4)this.speed=Math.max(this.speed,255);if(this.hits===12)this.speed=Math.max(this.speed,315);
    // Contact location controls angle; minimum horizontal component avoids vertical locks.
    let offset=clamp((b.x-hit.px)/(this.width/2),-.97,.97);if(Math.abs(offset)<.12)offset=.12*(Math.sign(b.vx)||1);
    const angle=offset*1.03;b.vx=Math.sin(angle)*this.speed;b.vy=-Math.cos(angle)*this.speed;this.events.push('bounce');
   }else{
    if(hit.nx)b.vx=-b.vx;if(hit.ny)b.vy=-b.vy;
    if(obj==='ceiling'&&!this.shrunk){this.width=29;this.shrunk=true;this.events.push('shrink');}
    else if(typeof obj==='object'&&obj){obj.alive=false;this.cleared++;this.score+=obj.points;this.effects.push({x:obj.x,y:obj.y,w:obj.w,h:obj.h,life:.18,row:obj.row});this.events.push('brick');if(obj.row<4)this.velocity(Math.max(this.speed,obj.row<2?375:330));}
   }
   b.x+=hit.nx*.01;b.y+=hit.ny*.01;
  }
  if(b.y>458)this.lose();
  if(!this.done&&this.bricks.every(b=>!b.alive)){if(this.wave===2){this.done=true;this.won=true;this.message='Dois muros completos. 896 pontos!';}else{this.wave++;this.wall();this.events.push('clear');}}
 }
}
