import { riverAt } from '../../games/shared/retro/river.js';
import { vineAt } from '../../games/shared/retro/pitfall.js';
export function drive(m){
 const close=m.cars.filter(c=>c.z>-17&&c.z<240), candidates=Array.from({length:23},(_,i)=>-.98+i*.089);
 let target=m.x,cost=Infinity;
 for(const x of candidates){let v=Math.abs(x-m.x)*.5;
   for(const c of close){const t=c.z/Math.max(1,m.speed-c.speed);if(t<-.16||t>1.7)continue;
     const weight=1.7-Math.max(0,t), clearance=Math.abs(x-c.x), travel=Math.abs(x-m.x)/1.25;
     if(clearance<.26)v+=(.26-clearance)*weight*150;
     const predicted=m.x+Math.sign(x-m.x)*Math.min(Math.abs(x-m.x),Math.max(0,t)*1.25);
     if(Math.abs(predicted-c.x)<.26&&travel>t)v+=weight*6;
   }if(v<cost){cost=v;target=x;}}
 return {action:true,left:m.x>target+.012,right:m.x<target-.012};
}
export function pilot(m){
 const bank=riverAt(m.distance+3), now=riverAt(m.distance);let target=bank.center;
 if(bank.island>0||now.island>0)target=bank.center+(bank.right-bank.center+Math.max(bank.island,now.island))/2;
 const fuel=m.objects.find(o=>!o.removed&&o.type==='fuel'&&o.z-m.distance>-16&&o.z-m.distance<85);
 const bridge=m.objects.find(o=>!o.removed&&o.type==='bridge'&&o.z-m.distance>0&&o.z-m.distance<110);
 if(fuel&&m.fuel<84&&!bank.island&&!now.island)target=fuel.x;
 if(bridge)target=bridge.x;
 const enemy=m.objects.find(o=>!o.removed&&!['fuel','bridge'].includes(o.type)&&o.z-m.distance>14&&o.z-m.distance<80);
 if(enemy&&!fuel&&!bank.island&&!now.island)target=enemy.x;
 const doRefill=!!fuel&&m.fuel<84;
 return {left:m.x>target+.4,right:m.x<target-.4,action:!doRefill,down:doRefill};
}

// A reproducible sequence of normal inputs through the first vine and crocodile rooms.
export function jungleRoute() {
 let stage=0, crossingSand=false;
 return m=>{
  if(m.roomIndex===0)return {right:true,action:m.grounded&&m.x>98&&m.x<101};
  if(m.roomIndex===1){
   const v=vineAt(m.time,m.room);
   if(m.hanging)return {action:v.x>112&&v.vx>0};
   if(m.x<40)return {right:true};
   if(m.x<56&&m.grounded)return {action:v.x<53&&v.vx<0};
   if(m.x>95)return {right:true};
   return {};
  }
  if(m.roomIndex===2){
   const targets=[50,82,104,134,165];let target=targets[stage];
   if(m.grounded&&Math.abs(m.x-target)<.6){stage++;target=targets[stage]??165;}
   return {left:m.x>target+.3,right:m.x<target-.3,action:stage>0&&stage<4&&m.grounded};
  }
  if(m.roomIndex===3){
   const phase=(m.time+m.room.phase)%5;
   if(m.x<51)return {right:true};
   if(phase>3.25&&phase<3.55)crossingSand=true;
   return {right:crossingSand};
  }
  return {};
 };
}
