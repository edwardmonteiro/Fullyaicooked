import { riverAt } from './river.js';
import { roadCurve, roadProjection } from './enduro.js';
import { vineAt, sandOpen, crocOpen } from './pitfall.js';

// Small original bitmap sprites and lettering, drawn on a 160 × 192 raster.
// Displayed at 4:3, matching the broad pixels of a television playfield.
const alphabet = {
  '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
  A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['111','100','100','100','111'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['111','100','101','101','111'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['001','001','001','101','111'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['111','101','101','101','111'],P:['111','101','111','100','100'],Q:['111','101','101','111','001'],R:['110','101','110','101','101'],S:['111','100','111','001','111'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111'],':':['000','010','000','010','000'],'-':['000','000','111','000','000'],'/':['001','001','010','100','100'],'.':['000','000','000','000','010'],'!':['010','010','010','000','010'],'+':['000','010','111','010','000']
};
const ink = (c,color,x,y,w,h) => { c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
export function text(c, value, x, y, color='#e7e7bc', scale=1, align='left') {
  const s=String(value).toUpperCase();if(align==='center')x-=s.length*4*scale/2;if(align==='right')x-=s.length*4*scale;
  for(let i=0;i<s.length;i++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(alphabet[s[i]]?.[row]?.[col]==='1')ink(c,color,x+(i*4+col)*scale,y+row*scale,scale,scale);
}
function sprite(c, rows, x, y, palette, flip=false) {
  const width=rows[0].length;
  rows.forEach((row,j)=>[...row].forEach((ch,i)=>{if(palette[ch])ink(c,palette[ch],x+(flip?width-1-i:i),y+j,1,1);}));
}
const plane=['....11....','....11....','....11....','...1111...','.11111111.','1111111111','....11....','...1111...','..111111..'];
const boat=['.....22.......','.....22.......','..111111111...','11111111111111','.111111111111.','..1111111111..'];
const heli=['11111111111','.....2.....','...22222...','..2223222..','112222222..','...22222...','....2.2....','...11111...'];
const jet=['....11......','...111......','111111111111','..111111111.','....111.....','.....11.....'];
function burst(c,x,y,t){for(let i=0;i<12;i++){const a=i*Math.PI/6,d=2+(1-t)*13;ink(c,i%2?'#f8df60':'#ee782e',x+Math.cos(a)*d,y+Math.sin(a)*d,2,3);}}
function river(c,m){
  ink(c,'#689e39',0,0,160,168);
  for(let y=0;y<168;y+=2){const b=riverAt(m.distance+136-y);ink(c,'#315d9e',b.left,y,b.right-b.left,2);if(b.island>0)ink(c,'#689e39',b.center-b.island,y,b.island*2,2);}
  // Decorative ground details are fixed in world space, never placed in water.
  for(let j=Math.floor((m.distance-40)/80);j<(m.distance+150)/80;j++){
    const z=j*80+12,y=136-(z-m.distance),b=riverAt(z),x=j%2?b.left-12:b.right+7;
    ink(c,'#426d29',x,y,5,3);ink(c,'#7bb447',x-2,y+3,9,4);ink(c,'#916c38',x+2,y+7,1,3);
  }
  for(const o of m.objects){
    const y=136-(o.z-m.distance);
    if(y < -32 || y>174 || (o.removed&&o.type!=='bridge'))continue;
    if(o.type==='bridge'){
      ink(c,'#b2a694',0,y-4,160,8);ink(c,'#55504b',0,y-1,160,2);
      for(let x=2;x<160;x+=8)ink(c,'#d7ca9b',x,y,4,1);
      if(o.removed){ink(c,'#315d9e',o.x-15,y-4,30,8);}
      else{ink(c,'#84624d',o.x-13,y-4,26,8);ink(c,'#dad18c',o.x-13,y-4,26,2);}
    }else if(o.type==='fuel'){
      ink(c,'#cb643d',o.x-6,y-15,12,30);ink(c,'#eee6ba',o.x-5,y-14,10,28);ink(c,'#d86843',o.x-4,y-13,8,26);
      [...'FUEL'].forEach((l,i)=>text(c,l,o.x-1,y-12+i*6,'#f6f0c4'));
    }else if(o.type==='ship')sprite(c,boat,o.x-7,y-3,{'1':'#b44742','2':'#c7b6a2'});
    else if(o.type==='helicopter'){sprite(c,heli,o.x-5,y-4,{'1':'#e5dba1','2':'#76b2af','3':'#223c57'},o.dir<0);if(Math.floor(m.time*15)%2)ink(c,'#315d9e',o.x-4,y-4,3,1);}
    else sprite(c,jet,o.x-6,y-3,{'1':'#d4d8c3'},o.dir<0);
  }
  if(m.bullet)ink(c,'#f8f1a7',m.bullet.x,136-(m.bullet.z-m.distance),1,5);
  if(m.dead>0)burst(c,m.x,136,m.dead/1.15);else sprite(c,plane,m.x-5,132,{'1':'#e8dd65'});
  for(const p of m.particles)burst(c,p.x,136-(p.z-m.distance),(p.until-m.time)/.35);
  ink(c,'#aaa496',0,168,160,24);text(c,String(m.score).padStart(6,'0'),80,172,'#252727',2,'center');
  text(c,'E',31,187,'#38352e');text(c,'F',125,187,'#38352e');ink(c,'#393c31',39,185,81,5);ink(c,m.refill?'#e5ec78':m.fuel<25?'#d84d30':'#d0d07a',40,186,Math.max(0,m.fuel*.79),3);
  for(let i=0;i<Math.min(m.lives,5);i++)sprite(c,['.1.','111','.1.'],4+i*5,185,{'1':'#38352e'});
  if(m.refill)text(c,'FUEL',80,157,'#f4e5a2',1,'center');
}
const palettes={day:['#628ca7','#ece2a0','#aeab61','#746950','#999b8c'],ice:['#839eac','#e9e9c9','#b3c2b7','#ced2bf','#e6e7d0'],sunset:['#bc7558','#efb96a','#73574a','#786853','#a09678'],night:['#171d3b','#555176','#34382a','#303336','#565653'],fog:['#a8aba0','#bab9a6','#aaa998','#96988b','#b0b0a0'],dawn:['#b28e9e','#dbc1aa','#877a55','#777365','#aaa88d']};
function car(c,x,y,scale,color,night=false){
  const w=Math.max(2,Math.round(11*scale)),h=Math.max(3,Math.round(16*scale)),l=Math.round(x-w/2),top=Math.round(y-h);
  if(night){ink(c,'#ee7358',l,y-3*scale,2*scale,2*scale);ink(c,'#ee7358',l+w-2*scale,y-3*scale,2*scale,2*scale);return;}
  ink(c,'#20231f',l-1,top+h*.2,2,h*.27);ink(c,'#20231f',l+w-1,top+h*.2,2,h*.27);ink(c,'#20231f',l-1,top+h*.69,2,h*.24);ink(c,'#20231f',l+w-1,top+h*.69,2,h*.24);
  ink(c,color,l+1,top,w-2,h);ink(c,color,l,top+h*.35,w,h*.5);ink(c,'#393f49',l+2,top+h*.21,w-4,h*.23);ink(c,'#dacdaf',l+2,top+h*.66,w-4,scale);ink(c,'#db7043',l+1,y-2*scale,2*scale,scale);ink(c,'#db7043',l+w-3*scale,y-2*scale,2*scale,scale);
}
const roadAt=roadProjection;
function enduroPalette(m){const phases=['day','ice','sunset','night','fog','dawn'],starts=[0,.25,.42,.54,.8,.94],i=phases.indexOf(m.phase),previous=palettes[phases[(i+5)%6]],next=palettes[m.phase],t=Math.min(1,(m.dayTime/120-starts[i])*60);if(i===0)return next;return next.map((hex,j)=>{const a=previous[j].match(/\w\w/g).map(v=>parseInt(v,16)),b=hex.match(/\w\w/g).map(v=>parseInt(v,16));return 'rgb('+a.map((v,k)=>Math.round(v+(b[k]-v)*t)).join(',')+')';});}
function enduro(c,m){
  const p=enduroPalette(m),night=m.phase==='night';
  ink(c,p[0],0,0,160,60);ink(c,p[1],118,23,7,9);
  for(let x=0;x<160;x+=2){const h=8+Math.sin((x+roadCurve(m.distance)*.2)*.06)*7+Math.sin(x*.17)*4;ink(c,p[2],x,54-h,2,h+8);}
  ink(c,p[2],0,58,160,110);
  for(let y=52;y<168;y++){
    const rel=(y-52)/103,z=Math.max(0,95*(1/Math.max(.008,rel)-1)),r=roadAt(m,z),stripe=Math.floor((m.distance+z)/28)%2;
    ink(c,p[3],r.x-r.half,y,r.half*2,1);
    const edge=Math.max(1,r.p*2);ink(c,p[4],r.x-r.half,y,edge,1);ink(c,p[4],r.x+r.half-edge,y,edge,1);
    if(stripe&&r.p>.1){ink(c,night?'#929784':p[4],r.x-r.half,y,edge*1.8,1);ink(c,night?'#929784':p[4],r.x+r.half-edge*1.8,y,edge*1.8,1);}
  }
  const visible=m.phase==='fog'?115:night?330:540;
  for(const v of [...m.cars].sort((a,b)=>b.z-a.z)){
    if(v.z< -18||v.z>visible)continue;const r=roadAt(m,Math.max(-10,v.z));
    car(c,r.x+v.x*r.half*.83,r.y,Math.max(.2,r.p),['#c69272','#d0be78','#76a887','#8292be','#d4d6bc'][v.color],night);
  }
  if(m.phase==='fog')for(let y=50;y<104;y++)ink(c,p[0],0,y,160,1);
  if(Math.abs(m.x)>1.02&&m.speed>5){for(let j=0;j<5;j++)ink(c,p[4],80+m.x*61-7+(j%2)*14,156+j*2+(Math.floor(m.distance/8)%3),2,2);}
  if(!m.bump||Math.floor(m.time*18)%2)car(c,80+m.x*61,157,1.05,'#e7e4c4');
  ink(c,'#252b27',0,168,160,24);
  text(c,String(Math.max(0,m.quota-m.passed)).padStart(3,'0'),8,171,m.qualified?'#a8db74':'#e4dbbb',2);
  text(c,'DIA '+m.day,75,172,'#d4cbaa');text(c,(m.distance/4500).toFixed(1).padStart(5,'0')+' KM',151,172,'#d4cbaa',1,'right');
  text(c,Math.round(m.speed*.8)+' KM/H',8,186,'#d4cbaa');
  for(let x=0;x<74;x+=3)ink(c,'#5f6551',76+x,184,2,4);ink(c,m.qualified?'#b8e58a':'#beab6c',76,184,Math.round(74*m.dayTime/120),4);
  if(m.qualified){for(let i=0;i<6;i++)ink(c,i%2?'#83bb62':'#dcefb0',41+(i%3)*2,171+Math.floor(i/3)*2,2,2);}
}
function harry(c,m){
  const walk=m.grounded&&Math.abs(m.vx)>1?Math.floor(m.time*10)%2:0,x=Math.round(m.x)-3,y=Math.round(m.y)-15;
  const rows=['..11..','..111.','..11..','..22..','.2222.','122221','..22..','..33..','..33..','..33..',...(m.hanging?['..33..','..33..','..3.3.','.3..3.','.3..3.']:walk?['.3.3..','3...3.','3....3','1....1','......']:['..33..','..33..','..3.3.','..3.3.','.11.11'])];
  sprite(c,rows,x,y,{'1':'#e2bd88','2':'#ce8d55','3':'#555dc6'},m.face<0);
  if(m.hanging){ink(c,'#e2bd88',m.x-2,y-2,1,5);ink(c,'#e2bd88',m.x+2,y-2,1,5);}
}
function jungle(c,m){
  const r=m.room;ink(c,'#869a49',0,0,160,128);ink(c,'#608039',0,46,160,82);
  [8,39,118,148].forEach((x,i)=>{ink(c,'#544431',x,35,i%2?4:6,91);ink(c,'#65553b',x+1,37,2,89);});
  ink(c,'#2d562b',0,0,160,44);for(let x=0;x<160;x+=8)ink(c,'#3d652e',x,39+(x%3)*2,9,9);
  ink(c,'#b7a350',0,128,160,17);ink(c,'#d0b268',0,129,160,2);ink(c,'#131c17',0,145,160,34);ink(c,'#a68e48',0,179,160,13);
  if(r.ladder){ink(c,'#182019',21,128,12,49);ink(c,'#ada377',23,130,1,47);ink(c,'#ada377',29,130,1,47);for(let y=133;y<176;y+=5)ink(c,'#ada377',23,y,7,1);}
  if(['vine','crocodiles','sand','pit'].includes(r.type)){
    const l=r.type==='crocodiles'?52:r.type==='pit'?63:r.type==='sand'?58:56,w=r.type==='crocodiles'?64:r.type==='pit'?31:r.type==='sand'?46:52;
    if(r.type!=='sand'||sandOpen(m.time,r)){ink(c,['vine','crocodiles'].includes(r.type)?'#416960':'#302d22',l,128,w,17);ink(c,'#252c20',l,128,w,2);}
    else{ink(c,'#ccb565',l,128,w,2);for(let x=l;x<l+w;x+=7)ink(c,'#867c39',x,129,3,1);}
    if(r.type==='crocodiles')for(const left of [56,78,100]){
      ink(c,'#415629',left,125,15,4);ink(c,'#415629',left+2,122,7,4);ink(c,'#ded277',left+8,122,1,1);
      if(crocOpen(m.time,r)){ink(c,'#263925',left+10,124,6,3);ink(c,'#c3b775',left+11,123,1,2);ink(c,'#c3b775',left+14,123,1,2);}
    }
  }
  if(r.type==='vine'){
    const v=vineAt(m.time,r);c.strokeStyle='#e0ce93';c.lineWidth=1;c.beginPath();c.moveTo(80,39);c.lineTo(Math.round(v.x),Math.round(v.y));c.stroke();
  }
  if(r.type==='logs'){
    const x=160-((m.time*23+r.index*29)%176);ink(c,'#675034',x-5,119,11,9);ink(c,'#baa665',x-5,120,3,7);ink(c,'#433e2d',x-4,122,1,3);ink(c,'#997a42',x,120,5,1);
  }
  if(r.type==='fire'){for(let i=0;i<5;i++)ink(c,i%2?'#df7b34':'#e9bd5b',83+i*2,120-((i*3+Math.floor(m.time*8))%7),2,128-(120-((i*3+Math.floor(m.time*8))%7)));}
  if(r.type==='snake')sprite(c,['...11...','..1111..','...111..','....11..','...11...','.11111..','1111111.'],85,121,{'1':'#514435'},Math.floor(m.time*2)%2);
  if(r.treasure&&!m.treasures.has(r.index)){
    const colors={2000:'#c4bf9a',3000:'#ccccbc',4000:'#e4bc49',5000:'#acd4db'};
    sprite(c,['...11...','..1111..','.111111.','11111111','.111111.','..1111..','...11...'],127,119,{'1':colors[r.value]});ink(c,'#eeecd2',130,119,1,3);
  }
  if(r.wall)ink(c,'#745a3a',76,145,8,34);else{
    const x=80+Math.sin(m.time*.9+r.phase)*36;
    sprite(c,['1.......','11......','.1......','.11111..','11111111','.1.1.1..','1...1.1.'],x-4,169,{'1':'#a79b62'},Math.cos(m.time*.9+r.phase)<0);
  }
  if(!m.dead&&(!m.invincible||Math.floor(m.time*10)%2))harry(c,m);
  else if(m.dead)burst(c,m.x,m.y-9,m.dead);
  text(c,String(Math.floor(m.score)).padStart(6,'0'),8,8,'#e5dab8',2);
  const remaining=Math.ceil(m.remaining),time=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');text(c,time,152,8,'#e5dab8',2,'right');
  text(c,'LIVES '+m.lives,8,25,'#e5dab8');text(c,String(m.treasures.size).padStart(2,'0')+'/32',152,25,'#e5dab8',1,'right');
  text(c,'ROOM '+String(m.roomIndex+1).padStart(3,'0'),8,185,'#262f20');text(c,m.layer?'TUNNEL':'JUNGLE',152,185,'#262f20',1,'right');
}
export const renderers = { 'river-raid':river, enduro, pitfall:jungle };
export function renderGame(context,kind,model) { context.save();context.imageSmoothingEnabled=false;renderers[kind](context,model);context.restore(); }
