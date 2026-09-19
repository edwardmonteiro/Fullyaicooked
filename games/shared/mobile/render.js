import { WIDTH as W, HEIGHT as H, CONFIG } from './models.js';
// Tight production-atlas bounds retain a little transparent edge padding.
const SPRITES={ship:[60,55,322,322],drone:[490,104,275,250],boss:[836,45,396,342],bike:[134,484,171,348],car:[527,450,199,372],truck:[930,455,204,372],city:[37,878,376,323],shield:[483,897,289,292],crystal:[952,893,158,304]};
const load = src => new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Artwork could not load'));img.src=new URL(src,import.meta.url).href;});
export async function loadArt(){const [scenery,sprites]=await Promise.all([load('./scenery.webp'),load('./sprites.webp')]);return {scenery,sprites};}
export class Renderer {
  constructor(canvas,kind,art){this.ctx=canvas.getContext('2d');this.kind=kind;this.art=art;this.col=CONFIG[kind].kind;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
  sprite(name,x,y,w,h=w,angle=0,alpha=1){const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.drawImage(this.art.sprites,...SPRITES[name],-w/2,-h/2,w,h);c.restore();}
  line(x,y,x2,y2,color,width=2){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
  glow(x,y,r,color){const c=this.ctx;c.save();c.shadowColor=color;c.shadowBlur=12;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();}
  text(text,x,y,size=12,color='#fff',align='center'){const c=this.ctx;c.fillStyle=color;c.font=`700 ${size}px ui-sans-serif, system-ui, sans-serif`;c.textAlign=align;c.fillText(text,x,y);}
  draw(m,active=false){const c=this.ctx;c.clearRect(0,0,W,H);c.save();
    const hit=m.fx.find(f=>f.type==='hit'&&f.age<.2);if(hit&&!this.reduced)c.translate(Math.sin(hit.age*180)*3,Math.cos(hit.age*160)*2);
    if(this.col===1&&!this.reduced){const offset=(m.distance*.76)%H;c.drawImage(this.art.scenery,512,0,512,1024,0,offset-H,W,H);c.drawImage(this.art.scenery,512,0,512,1024,0,offset,W,H);}else c.drawImage(this.art.scenery,this.col*512,0,512,1024,0,0,W,H);
    if(this.col===0)this.space(m);if(this.col===1)this.road(m);if(this.col===2)this.defense(m,active);
    this.effects(m);c.restore();
    c.fillStyle='rgba(8,17,32,.64)';c.fillRect(0,0,W,27);this.text(m.detail,12,18,10,'#e5ebf7','left');
    c.fillStyle='rgba(255,255,255,.13)';c.fillRect(0,H-3,W,3);c.fillStyle=CONFIG[this.kind].accent;c.fillRect(0,H-3,W*m.fraction,3);
  }
  space(m){const c=this.ctx;
    if(!this.reduced){for(let i=0;i<27;i++){const x=(i*83+19)%360,y=(i*131+m.time*(12+i%4*9))%576;c.fillStyle=i%2?'#bcdfff66':'#ffffffff';c.fillRect(x,y,1,i%3===0?3:1);}}
    for(const p of m.pickups)this.sprite(p.type==='shield'?'shield':'crystal',p.x,p.y,32,32,Math.sin(m.time*4)*.12);
    for(const b of m.shots){this.line(b.x,b.y+13,b.x,b.y-7,'#b0faff',3);this.glow(b.x,b.y,2,'#b0faff');}
    for(const b of m.bullets){this.line(b.x-b.vx*.04,b.y-b.vy*.04,b.x,b.y,'#ff826c',3);this.glow(b.x,b.y,3,'#ff997d');}
    for(const e of m.enemies){this.glow(e.x,e.y-15,3,'#ff785b');this.sprite(e.kind===2?'boss':'drone',e.x,e.y,e.kind===2?62:43,e.kind===2?53:40,Math.PI);}
    if(m.boss){const b=m.boss;this.sprite('boss',b.x,b.y,114,98,Math.PI);c.fillStyle='#10192a';c.fillRect(78,35,204,5);c.fillStyle='#ff957e';c.fillRect(80,36,200*Math.max(0,b.hp/b.maxHp),3);}
    if(m.hull>0){if(m.invulnerable<=0||Math.floor(m.time*13)%2===0){this.glow(m.x,m.y+23,4+Math.sin(m.time*42),'#79e4ff');this.sprite('ship',m.x,m.y,56,60);}
      if(m.shield>0){c.strokeStyle='#8af2faaa';c.lineWidth=2;c.beginPath();c.arc(m.x,m.y,36,0,Math.PI*2);c.stroke();}}
    if(m.pulse>0){c.strokeStyle=`rgba(172,246,255,${m.pulse})`;c.lineWidth=5;c.beginPath();c.arc(m.x,m.y,(.55-m.pulse)*850,0,Math.PI*2);c.stroke();}
    if(m.power>0)this.text('DOUBLE FIRE',180,560,10,'#a5f2fa');
  }
  road(m){const c=this.ctx;
    for(const p of m.coins){const y=m.y-(p.z-m.distance)*.76;if(y>-30&&y<600)this.sprite('crystal',p.x,y,17,31,Math.sin(m.time*4)*.1);}
    for(const car of m.traffic){const y=m.y-(car.z-m.distance)*.76;if(y>-95&&y<640)this.sprite(car.type?'truck':'car',car.x,y,43,81);}
    if(m.boosting){for(const d of [-9,9]){this.line(m.x+d,m.y+27,m.x+d,m.y+68,'#8ae5eaaa',4);this.glow(m.x+d,m.y+30,3,'#92f1fd');}if(!this.reduced)for(let i=0;i<8;i++){const y=(m.time*740+i*90)%H;this.line(i%2?325:35,y,i%2?325:35,y+37,'#fff7d455',2);}}
    if(m.hull>0&&(m.invulnerable<=0||Math.floor(m.time*13)%2===0))this.sprite('bike',m.x,m.y,33,72,(m.lane===0&&m.x>105?-.1:m.lane===2&&m.x<255?.1:0));
    if(m.fraction>.96){const y=H-(1-m.fraction)*15000;for(let i=0;i<12;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#293448':'#f9edde';c.fillRect(70+i*18.4,y+j*10,18.4,10);}}
  }
  defense(m,active){const c=this.ctx;
    for(const city of m.cities){if(city.hp<=0){c.fillStyle='rgba(16,22,38,.9)';c.beginPath();c.ellipse(city.x,547,35,25,0,0,Math.PI*2);c.fill();for(let i=0;i<3;i++)this.glow(city.x+(i-1)*9,533-Math.sin(m.time*4+i)*5,4,'#ff976d');}
      else{c.fillStyle='#121e39aa';c.fillRect(city.x-18,560,36,4);c.fillStyle=city.hp===2?'#a8eee4':'#ffa18a';c.fillRect(city.x-18,560,18*city.hp,4);}}
    for(const msl of m.missiles){const a=Math.atan2(550-msl.y,m.cities[msl.target].x-msl.x);const len=Math.min(55,msl.y+12);this.line(msl.x-Math.cos(a)*len,msl.y-Math.sin(a)*len,msl.x,msl.y,'#ff8c7488',2);this.glow(msl.x,msl.y,3,msl.split?'#ffc783':'#ff987e');c.save();c.translate(msl.x,msl.y);c.rotate(a+Math.PI/2);c.fillStyle=msl.split?'#ffd7a0':'#ffbfaa';c.beginPath();c.moveTo(0,-6);c.lineTo(3,6);c.lineTo(-3,6);c.fill();c.restore();if(msl.split){c.strokeStyle='#ffd7a0';c.strokeRect(msl.x-5,msl.y-5,10,10);}}
    for(const i of m.interceptors){const a=Math.atan2(i.ty-i.y,i.tx-i.x);this.line(i.x-Math.cos(a)*24,i.y-Math.sin(a)*24,i.x,i.y,'#8fefffaa',2);this.glow(i.x,i.y,2.5,'#caffff');c.strokeStyle='#abeaff44';c.beginPath();c.arc(i.tx,i.ty,6,0,Math.PI*2);c.stroke();}
    for(const b of m.blasts){const r=Math.max(.1,b.r);const g=c.createRadialGradient(b.x,b.y,0,b.x,b.y,r);g.addColorStop(0,'#d2ffffa0');g.addColorStop(.4,'#6ae7ff30');g.addColorStop(1,'#8df6ff08');c.fillStyle=g;c.beginPath();c.arc(b.x,b.y,r,0,Math.PI*2);c.fill();c.strokeStyle=b.chain?'#fdd29c99':'#a4faff99';c.lineWidth=1.5;c.stroke();}
    if(active){const a=m.aim;c.strokeStyle='#d1edff88';c.lineWidth=1;for(const n of [-1,1]){this.line(a.x+n*5,a.y,a.x+n*11,a.y,'#d1edff88',1);this.line(a.x,a.y+n*5,a.x,a.y+n*11,'#d1edff88',1);}}
  }
  effects(m){const c=this.ctx;
    for(const f of m.fx){const p=f.age/.8;if(['burst','hit','spark','pickup'].includes(f.type)){const color=f.type==='pickup'?'#ffe7a6':f.type==='hit'?'#ff9078':'#a9f3ff';c.globalAlpha=1-p;for(let j=0;j<(f.type==='spark'?4:9);j++){const a=j*2.399,r=f.age*(f.type==='spark'?30:68);this.line(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,f.x+Math.cos(a)*(r+5),f.y+Math.sin(a)*(r+5),color,2);}c.globalAlpha=1;}
      if(f.type==='near')this.text('CLOSE CALL +120',f.x,f.y-f.age*30,12,'#fff1b7');
      if(f.type==='checkpoint'){c.fillStyle='#102035d9';c.fillRect(58,170,244,52);this.text(this.col===2?'WAVE CLEAR':'CHECKPOINT',180,194,17);this.text(this.col===2?'ENERGY RESTORED':'HULL REPAIRED',180,211,9,'#9ed9de');}
      if(f.type==='warning'&&this.col===0){c.fillStyle='#1a213de8';c.fillRect(64,165,232,46);this.text('SENTINEL INBOUND',180,194,16,'#ffc5b6');}
    }
  }
}
