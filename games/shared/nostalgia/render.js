import {W,H,clamp} from './common.js';
import {FISH_ROWS} from './fishing.js';
import {CLOUDS,PLANE_PARTS,JET_PARTS} from './combat.js';
import {floorY,escalatorX,STORE_WIDTH,obstacleBox} from './keystone.js';

function box(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function text(ctx,value,x,y,color='#f7efd3',size=12,align='left'){
  ctx.fillStyle=color;ctx.font=`bold ${size}px ui-monospace, monospace`;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function pixels(ctx,pattern,x,y,color,scale=1,flip=false){
  ctx.fillStyle=color;const width=pattern[0].length;
  pattern.forEach((row,iy)=>{for(let ix=0;ix<row.length;ix++)if(row[ix]==='1')ctx.fillRect(Math.round(x+(flip?width-ix-1:ix)*scale),Math.round(y+iy*scale),scale,scale);});
}
const FISH=['0000011111000000','1001111111110000','1111111111111100','1111111111111111','1111111111111100','1001111111110000','0000011111000000'];
const SHARK=['000000000000000000100000000000000000000000','000000000000000001110000000000000000000000','000000000000000011110000000000000000000000','110000000111111111111111111111111000000000','111100011111111111111111111111111110000000','111111111111111111111111111111111111110000','111111111111111111111111111111111111111111','111111111111111111111111111111111111111110','111100011111111111111111111111111111000000','110000000111111111111111111111110000000000','000000000000000011110000000000000000000000','000000000000000001110000000000000000000000'];

function angler(ctx,x,flip,color){
  ctx.save();ctx.translate(x,67);ctx.scale(flip?-1:1,1);
  box(ctx,color,-8,-26,12,4);box(ctx,color,-6,-30,9,4);box(ctx,'#efc89d',-5,-22,8,8);
  box(ctx,color,-7,-14,12,11);box(ctx,'#efc89d',5,-12,9,4);box(ctx,'#27374a',-6,-3,15,4);box(ctx,'#27374a',5,0,4,10);
  ctx.restore();
}
function fishing(ctx,m){
  box(ctx,'#efb76b',0,0,W,70);box(ctx,'#f7d387',0,0,W,22);box(ctx,'#20394e',0,71,W,H-71);
  for(let r=0;r<6;r++)box(ctx,['#234456','#265364','#286170','#2a6d78','#2b7780','#2e8186'][r],0,97+r*26,W,26);
  box(ctx,'#14323f',0,258,W,30);box(ctx,'#95d5c8',0,70,W,2);
  box(ctx,'#7d472c',0,65,76,7);box(ctx,'#7d472c',308,65,76,7);box(ctx,'#eac57e',0,65,76,2);box(ctx,'#eac57e',308,65,76,2);
  for(const x of[9,58,321,369])box(ctx,'#6a493a',x,72,5,19);
  angler(ctx,34,false,'#be3d35');angler(ctx,350,true,'#2e618a');
  text(ctx,'VOCÊ',27,22,'#6d2c25',12);text(ctx,'RIVAL',354,22,'#224563',12,'right');
  for(let row=0;row<6;row++){text(ctx,String(2+Math.floor(row/2)*2),191,FISH_ROWS[row]+4,'#8cc0c1',10,'center');}
  for(let i=0;i<2;i++){
    const h=m.hooks[i],anchor=i?336:48;
    ctx.strokeStyle='#eee0b5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(anchor,55);ctx.lineTo(h.x,40);ctx.lineTo(h.x,h.y);ctx.stroke();
    box(ctx,'#fff2ce',h.x-1,h.y-2,2,5);box(ctx,'#fff2ce',h.x-3,h.y+1,4,2);
  }
  for(const f of m.fish){if(f.cooldown)continue;pixels(ctx,FISH,f.x-8,f.y-3,f.row<2?'#efd48b':f.row<4?'#ffd487':'#ffab6b',1,f.dir<0);box(ctx,'#122e3b',f.x+f.dir*5,f.y-1,1,1);}
  const s=m.shark;pixels(ctx,SHARK,s.x-21,s.y-6,s.bite?'#f1e2cf':'#8ca6ad',1,s.dir<0);
  box(ctx,'#142837',s.x+s.dir*13,s.y-1,2,2);
  if(s.bite)box(ctx,'#142837',s.x+(s.dir>0?13:-22),s.y+2,9,3);
  text(ctx,'2 lb · 4 lb · 6 lb',192,280,'#b6d2cc',12,'center');
}
function combat(ctx,m){
  const jet=m.variant==='jets';box(ctx,jet?'#92a79e':'#bdc9cc',0,0,W,H);
  // Short border marks keep the wraparound flight area readable without a grid.
  for(let x=0;x<W;x+=32){box(ctx,'#728d91',x,0,8,2);box(ctx,'#728d91',x,H-2,8,2);}
  for(let y=0;y<H;y+=32){box(ctx,'#728d91',0,y,2,8);box(ctx,'#728d91',W-2,y,2,8);}
  for(let i=0;i<2;i++){
    const p=m.planes[i],color=i?'#a83c35':'#174f80';
    if(p.immune&&!p.stun&&Math.floor(m.time*10)%2)continue;
    for(const ox of[-W,0,W])for(const oy of[-H,0,H]){
      ctx.save();ctx.translate(p.x+ox,p.y+oy);ctx.rotate(p.angle);
      for(const r of jet?JET_PARTS:PLANE_PARTS)box(ctx,color,...r);
      if(!jet)box(ctx,'#e8d8b7',1,-1,4,2);
      if(p.stun){box(ctx,'#f9d175',-7,-3,14,6);box(ctx,'#ef7541',-3,-7,6,14);}
      ctx.restore();
    }
  }
  for(const b of m.bullets)box(ctx,b.owner?'#a83c35':'#174f80',b.x-2,b.y-2,4,4);
  if(!jet)for(const c of CLOUDS){box(ctx,'#e4e7dc',c.x,c.y+9,c.w,c.h-18);box(ctx,'#e4e7dc',c.x+11,c.y,c.w-22,c.h);box(ctx,'#d8ded7',c.x+11,c.y+c.h-5,c.w-22,5);}
  text(ctx,jet?'JATOS':m.variant==='rapid'?'BIPLANOS · RAJADAS':'BIPLANOS',192,23,'#344f59',12,'center');
  if(m.time<4){text(ctx,'VOCÊ',m.planes[0].x,m.planes[0].y-19,'#174f80',12,'center');text(ctx,'RIVAL',m.planes[1].x,m.planes[1].y-19,'#a83c35',12,'center');}
}

function actor(ctx,a,m,thief=false){
  const ride=a.ride,y=ride?floorY(ride.from+(ride.to-ride.from)*ride.progress):floorY(a.floor)+a.z;
  const x=a.x-m.camera;if(x<-20||x>W+20)return;
  if(!thief&&a.immune&&Math.floor(m.time*10)%2)return;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(a.facing,1);
  const body=thief?'#aa3528':'#205674',pants=thief?'#363c35':'#213d56',skin='#efc498',bob=a.duck?12:0;
  box(ctx,body,-6,-24+bob,11,3);box(ctx,body,-4,-28+bob,7,4);box(ctx,skin,-4,-21+bob,8,6);box(ctx,'#202b30',2,-20+bob,2,2);
  box(ctx,body,-5,-15+bob,10,a.duck?4:11);box(ctx,skin,5,-14+bob,4,4);
  if(!thief){box(ctx,'#e7c576',-3,-13+bob,2,3);box(ctx,'#49322c',8,-13+bob,2,10);}
  else {box(ctx,'#e4dbbd',-6,-12+bob,12,2);box(ctx,'#e4dbbd',-6,-8+bob,12,2);}
  const step=a.duck?0:Math.sin(m.time*15)*3;
  box(ctx,pants,-5,-4,4,4);box(ctx,pants,2,-4,4,4);box(ctx,'#202d31',-7+step,-2,6,2);box(ctx,'#202d31',2-step,-2,6,2);
  ctx.restore();
}
function keystone(ctx,m){
  const cam=m.camera;box(ctx,'#92b3a5',0,0,W,240);box(ctx,'#acbca6',0,0,W,56);
  for(let f=0;f<4;f++){
    const y=floorY(f);if(f<3){box(ctx,f%2?'#647f6d':'#72876b',0,y-50,W,48);
      for(let x=24;x<STORE_WIDTH;x+=140){const sx=x-cam;if(sx<-130||sx>W)continue;
        box(ctx,'#354e4a',sx,y-38,82,29);box(ctx,'#c6b785',sx+3,y-35,76,24);box(ctx,'#8e7850',sx+40,y-35,3,24);box(ctx,'#e5c997',sx+3,y-35,76,3);
      }
    }
    box(ctx,'#e8c994',0,y,W,5);box(ctx,'#765f46',0,y+5,W,2);
    text(ctx,f===3?'T':' '+f,7,y-34,'#edf0cd',11);
    if(f<3){const ex=escalatorX(f)-cam,dir=f%2===0?-1:1;
      for(let s=0;s<8;s++){const xx=ex+dir*s*4,yy=y-s*7;box(ctx,'#283e37',xx-5,yy-3,10,3);box(ctx,'#dfd0a3',xx-5,yy-5,10,2);}
    }
  }
  const ex=m.liftX-cam,lift=m.elevator;
  box(ctx,'#364d44',ex-21,floorY(2)-37,42,floorY(0)-floorY(2)+37);
  for(let f=0;f<3;f++){
    const y=floorY(f);box(ctx,'#b59e73',ex-22,y-38,44,38);
    const open=lift.open&&lift.floor===f;box(ctx,open?'#91be68':'#607967',ex-18,y-34,36,34);
    if(!open)box(ctx,'#233c36',ex-1,y-34,2,34);
    box(ctx,open?'#dfd999':'#526144',ex+25,y-25,4,5);
  }
  if(!lift.open)box(ctx,'#8c9c7c',ex-18,floorY(lift.position)-34,36,34);
  for(const item of m.pickups){if(item.taken)continue;const x=item.x-cam,y=floorY(item.floor);if(x<-20||x>W+20)continue;
    box(ctx,'#f3c95e',x-7,y-11,14,10);box(ctx,'#f3c95e',x-3,y-14,6,3);box(ctx,'#8c663b',x-1,y-10,2,7);
  }
  for(const o of m.obstacles){const b=obstacleBox(o,m.clock),x=b.x-cam;if(x<-30||x>W+30)continue;
    if(o.type==='radio'){box(ctx,'#463b30',x,b.y,16,17);box(ctx,'#dec287',x+3,b.y+3,10,10);for(let j=0;j<3;j++)box(ctx,'#705139',x+4,b.y+4+j*3,8,1);}
    if(o.type==='cart'){box(ctx,'#764038',x,b.y,22,10);box(ctx,'#e5d5ac',x+2,b.y+2,17,5);box(ctx,'#252f31',x+3,b.y+12,4,3);box(ctx,'#252f31',x+16,b.y+12,4,3);}
    if(o.type==='ball'){box(ctx,'#c16a3d',x+2,b.y,8,12);box(ctx,'#e8bf75',x,b.y+2,12,8);box(ctx,'#bd4f37',x+5,b.y+2,3,8);}
    if(o.type==='plane'){box(ctx,'#793c38',x,b.y+3,26,3);box(ctx,'#793c38',x+8,b.y,11,2);box(ctx,'#793c38',x+8,b.y+6,11,2);}
  }
  actor(ctx,m.thief,m,true);actor(ctx,m.player,m);
  box(ctx,'#1d342f',0,239,W,49);text(ctx,'MAPA',9,254,'#c4c5a4',10);
  const mapX=61,mapW=300;
  for(let f=0;f<4;f++)box(ctx,'#78947f',mapX,246+(3-f)*10,mapW,1);
  for(let f=0;f<3;f++){const x=mapX+escalatorX(f)/STORE_WIDTH*mapW;box(ctx,'#afbc91',x,239+(3-f)*10,2,8);}
  box(ctx,'#a7ada0',mapX+m.liftX/STORE_WIDTH*mapW-2,242+(3-lift.position)*10,4,5);
  const marker=(a,color)=>{const f=a.ride?a.ride.from+a.ride.progress:a.floor;box(ctx,color,mapX+a.x/STORE_WIDTH*mapW-2,241+(3-f)*10,5,5);};
  marker(m.thief,'#f9efc8');marker(m.player,'#63b6e1');
  const p=m.player;
  if(p.inLift)text(ctx,lift.open?'↓ SAIR':'SUBINDO / DESCENDO',192,16,'#f9efc8',11,'center');
}
export function render(ctx,kind,m){
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
  if(kind==='fishing-derby')fishing(ctx,m);else if(kind==='combat')combat(ctx,m);else keystone(ctx,m);
  if(m.feedbackTime>0){const y=kind==='keystone-kapers'?29:244;box(ctx,'#12212bea',30,y,W-60,23);text(ctx,m.feedback,192,y+16,'#fff2c9',12,'center');}
  ctx.restore();
}
