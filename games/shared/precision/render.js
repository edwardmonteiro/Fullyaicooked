import {W,H,rockVertices} from './common.js';
import {BRICK_COLORS} from './breakout.js';
const aliens=[['00111100','01111110','11011011','11111111','00100100','01011010'],['00100100','01111110','11011011','11111111','10100101','00100100'],['00011000','00111100','01111110','11011011','11111111','01000010']];
function pixels(c,rows,x,y,size,color){c.fillStyle=color;for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++)if(rows[j][i]==='1')c.fillRect(Math.round(x+i*size),Math.round(y+j*size),size,size);}
function invaders(c,m){
 for(const s of m.shields)if(s.alive){c.fillStyle='#70d996';c.fillRect(s.x,s.y,4,4);}
 for(const a of m.aliens)if(a.alive){const p=m.position(a),rows=aliens[Math.floor(a.row/2)];pixels(c,rows,p.x-12,p.y-9,3,'#f6efdb');if(m.animation%2){c.fillStyle='#050809';c.fillRect(p.x-12,p.y+6,24,3);c.fillStyle='#f6efdb';c.fillRect(p.x-8,p.y+6,4,3);c.fillRect(p.x+4,p.y+6,4,3);}}
 if(m.ufo)pixels(c,['00001111110000','00111111111100','01101101101110','11111111111111','00110000001100'],m.ufo.x-18,18,2.5,'#f3827f');
 if(!m.dead&&(!m.invulnerable||Math.floor(m.time*10)%2))pixels(c,['00000100000','00001110000','00001110000','01111111110','11111111111','11111111111'],m.x-11,405,2,'#70d996');
 c.fillStyle='#f6efdb';if(m.shot)c.fillRect(Math.round(m.shot.x)-1,m.shot.y,2,8);
 c.strokeStyle='#f4ba75';c.lineWidth=2;for(const b of m.bombs){c.beginPath();c.moveTo(b.x,b.y-6);c.lineTo(b.x-2,b.y-2);c.lineTo(b.x+2,b.y+2);c.lineTo(b.x,b.y+6);c.stroke();}
 c.fillStyle='#45654c';c.fillRect(12,436,336,1);
 for(const e of m.effects){c.globalAlpha=Math.min(1,e.life*5);c.fillStyle=e.type==='shield'?'#70d996':'#f6efdb';if(e.type==='200'){c.font='bold 16px monospace';c.textAlign='center';c.fillText('+200',e.x,e.y+15);}else for(let i=0;i<8;i++){const a=i*Math.PI/4;c.fillRect(e.x+Math.cos(a)*14,e.y+Math.sin(a)*14,3,3);}c.globalAlpha=1;}
 if(m.transition)caption(c,'ONDA COMPLETA');
}
function breakout(c,m){
 c.fillStyle='#65686a';c.fillRect(9,14,3,420);c.fillRect(348,14,3,420);c.fillRect(9,11,342,3);
 for(const b of m.bricks)if(b.alive){c.fillStyle=BRICK_COLORS[b.row];c.fillRect(b.x+1,b.y+1,b.w-2,b.h-2);}
 for(const e of m.effects){c.globalAlpha=e.life/.18;c.fillStyle=BRICK_COLORS[e.row];c.fillRect(e.x+1,e.y+1,e.w-2,e.h-2);c.globalAlpha=1;}
 c.fillStyle='#f6efdb';c.fillRect(m.x-m.width/2,410,m.width,7);c.fillRect(m.ball.x-3,m.ball.y-3,6,6);
 if(m.waiting)caption(c,'TOQUE EM SACAR');
}
function rock(c,r,x,y){c.beginPath();rockVertices(r,x,y).forEach((p,i)=>{i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.closePath();c.stroke();}
function asteroids(c,m){
 c.strokeStyle='#f6efdb';c.lineWidth=1.5;c.lineJoin='round';
 for(const r of m.rocks)for(const dx of [-W,0,W])for(const dy of [-H,0,H]){if(r.x+dx+r.r<0||r.x+dx-r.r>W||r.y+dy+r.r<0||r.y+dy-r.r>H)continue;rock(c,r,r.x+dx,r.y+dy);}
 if(!m.dead&&(!m.invulnerable||Math.floor(m.time*8)%2)){
  const s=m.ship;for(const dx of [-W,0,W])for(const dy of [-H,0,H]){if(s.x+dx< -15||s.x+dx>W+15||s.y+dy< -15||s.y+dy>H+15)continue;c.save();c.translate(s.x+dx,s.y+dy);c.rotate(s.angle);c.beginPath();c.moveTo(12,0);c.lineTo(-9,-8);c.lineTo(-5,0);c.lineTo(-9,8);c.closePath();c.stroke();if(s.thrust&&Math.floor(m.time*30)%2){c.beginPath();c.moveTo(-7,-4);c.lineTo(-17,0);c.lineTo(-7,4);c.stroke();}c.restore();}
 }
 c.fillStyle='#f6efdb';for(const b of m.bullets)c.fillRect(b.x-1.5,b.y-1.5,3,3);c.fillStyle='#ef9988';for(const b of m.enemyBullets)c.fillRect(b.x-2,b.y-2,4,4);
 if(m.ufo){const u=m.ufo,k=u.small?.7:1;c.save();c.translate(u.x,u.y);c.scale(k,k);c.beginPath();c.moveTo(-18,0);c.lineTo(-8,-5);c.lineTo(-5,-11);c.lineTo(5,-11);c.lineTo(8,-5);c.lineTo(18,0);c.lineTo(9,6);c.lineTo(-9,6);c.closePath();c.moveTo(-18,0);c.lineTo(18,0);c.moveTo(-8,-5);c.lineTo(8,-5);c.stroke();c.restore();}
 for(const e of m.effects){c.globalAlpha=Math.min(1,e.life*3);for(let i=0;i<9;i++){const a=i*2.4,d=(1-e.life/.8)*e.r*2;c.beginPath();c.moveTo(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d);c.lineTo(e.x+Math.cos(a)*(d+4),e.y+Math.sin(a)*(d+4));c.stroke();}c.globalAlpha=1;}
 if(m.transition)caption(c,'SETOR LIVRE');
}
function caption(c,words){c.font='bold 16px monospace';c.textAlign='center';c.fillStyle='#f6efdb';c.fillText(words,W/2,H*.62);}
const draw={'space-invaders':invaders,breakout,asteroids};
export function render(c,kind,m){c.save();c.imageSmoothingEnabled=false;c.fillStyle='#050809';c.fillRect(0,0,W,H);draw[kind](c,m);c.restore();}
