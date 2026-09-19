// Controllers use only normal movement, aiming and action inputs.
export function pilot(m){
 const enemies=m.enemies.filter(e=>e.y>20&&e.y<m.y-50).sort((a,b)=>b.y-a.y);
 const aim=m.boss?m.boss.x:enemies[0]?.x??180;
 let best={x:180,cost:Infinity};
 for(let x=25;x<=335;x+=10){let cost=Math.abs(x-aim)*.03+Math.abs(x-m.x)*.007;
  for(const b of m.bullets){if(b.vy<=0)continue;const t=(490-b.y)/b.vy;if(t<-.12||t>1.35)continue;const px=m.x+Math.max(-340*Math.max(0,t),Math.min(340*Math.max(0,t),x-m.x));const bx=b.x+b.vx*t;cost+=Math.max(0,31-Math.abs(px-bx))**2*(1.5-t);}
  for(const e of m.enemies){if(e.y>390)cost+=Math.max(0,45-Math.abs(x-e.x))**2;}
  if(cost<best.cost)best={x,cost};
 }
 return{targetX:best.x,targetY:490,action:best.cost>80&&m.charges>0&&m.invulnerable<=0};
}
export function driver(m){const upcoming=m.traffic.filter(c=>!c.passed&&c.z-m.distance>-80).sort((a,b)=>a.z-b.z);const first=upcoming[0];let lane=m.lane;if(first){const blocked=upcoming.filter(c=>Math.abs(c.z-first.z)<100).map(c=>c.lane);lane=[0,1,2].filter(n=>!blocked.includes(n)).sort((a,b)=>Math.abs(a-m.lane)-Math.abs(b-m.lane))[0]??lane;}return{lane,action:m.energy>25};}
export function defender(m){if(m.fireCooldown>0||m.energy<1)return{};const targets=m.missiles.filter(a=>!m.blasts.some(b=>Math.hypot(a.x-b.x,a.y-b.y)<b.r+15)&&!m.interceptors.some(b=>Math.hypot(a.x-b.tx,a.y-b.ty)<48)).sort((a,b)=>b.y-a.y);const t=targets[0];if(!t||t.y<80)return{};const travel=Math.hypot(t.x-180,t.y-485)/590+.16;const a=Math.atan2(550-t.y,m.cities[t.target].x-t.x);return{target:{x:t.x+Math.cos(a)*t.speed*travel,y:t.y+Math.sin(a)*t.speed*travel}};}
