import test from 'node:test';
import assert from 'node:assert/strict';
import { RiverRaid } from '../games/shared/retro/river.js';
import { Enduro, DAY_LENGTH } from '../games/shared/retro/enduro.js';
import { Pitfall, jungleRoom, ROOM_COUNT, TREASURE_COUNT } from '../games/shared/retro/pitfall.js';
import { drive, pilot, jungleRoute } from './fixtures/retro-routes.mjs';
const dt=1/120;
const run=(model,seconds,controller=()=>({}))=>{for(let i=0;i<seconds*120&&!model.done;i++)model.step(dt,controller(model));};

test('river route clears six bridges without changing physics or granting fuel',()=>{
  const m=new RiverRaid();run(m,180,pilot);
  assert.equal(m.done,false);assert.equal(m.lives,3);assert(m.bridges>=6);assert(m.score>=6000);assert(m.checkpoint>5000);
});
test('river repeated collisions exhaust three jets and final score freezes',()=>{
  const m=new RiverRaid();run(m,20,()=>({left:true,action:true}));
  assert.equal(m.lives,0);assert.equal(m.done,true);const score=m.score,distance=m.distance;run(m,10,()=>({action:true}));assert.equal(m.score,score);assert.equal(m.distance,distance);
});
test('fuel depots refill a passing jet but shooting one destroys the supply',()=>{
  const m=new RiverRaid(),fuel=m.objects.find(o=>o.type==='fuel');m.distance=fuel.z;m.x=fuel.x;m.fuel=25;
  run(m,.2,()=>({down:true}));assert(m.fuel>35);assert(m.refill);assert.equal(m.score,0);
  const n=new RiverRaid(),target=n.objects.find(o=>o.type==='fuel');n.distance=target.z-50;n.x=target.x;n.bullet={x:target.x,z:target.z-4};n.step(dt,{});
  assert.equal(target.removed,true);assert.equal(n.score,80);
});
test('bridge destruction stores a restart point and score awards extra jets',()=>{
  const m=new RiverRaid();run(m,30,pilot);assert(m.bridges>=1);const checkpoint=m.checkpoint;
  m.crash('test collision');run(m,1.2,()=>({}));assert(m.distance>=checkpoint&&m.distance<checkpoint+5);assert.equal(m.lives,2);
  m.addScore(20000);assert.equal(m.lives,4);assert.equal(m.extra,30000);
});
test('Enduro supports both daily quotas with normal steering and accelerator inputs',()=>{
  const m=new Enduro();run(m,241,drive);assert.equal(m.done,false);assert.equal(m.day,3);assert.equal(m.quota,300);assert(m.totalPassed>=500);
});
test('Enduro coasts when gas is released, brakes on down, and fails a missed dawn quota',()=>{
  const m=new Enduro();run(m,2,()=>({action:true}));const speed=m.speed;run(m,.5);assert.equal(m.speed,speed);run(m,.5,()=>({down:true}));assert(m.speed<speed-45);
  const parked=new Enduro();run(parked,DAY_LENGTH+.01);assert.equal(parked.done,true);assert.match(parked.message,/200 carros/);assert.equal(parked.day,1);
});
test('Enduro ice has slower steering response and night and fog occur before dawn',()=>{
  const dry=new Enduro(),ice=new Enduro();dry.speed=ice.speed=180;ice.dayTime=DAY_LENGTH*.3;
  run(dry,.3,()=>({right:true}));run(ice,.3,()=>({right:true}));assert(dry.x>ice.x+.1);
  const m=new Enduro();m.dayTime=DAY_LENGTH*.6;assert.equal(m.phase,'night');m.dayTime=DAY_LENGTH*.85;assert.equal(m.phase,'fog');m.dayTime=DAY_LENGTH*.97;assert.equal(m.phase,'dawn');
});
test('an opponent overtaking back removes its pass, without altering a previous day quota',()=>{
  const m=new Enduro();m.x=-.8;m.speed=260;const car={z:-13,x:.8,speed:100,passed:false,countedDay:0};m.cars=[car];m.step(dt,{});assert.equal(m.passed,1);
  m.speed=0;run(m,.4);assert.equal(m.passed,0);assert.equal(car.passed,false);
  m.day=2;m.passed=12;car.passed=true;car.countedDay=1;car.z=13;m.step(.02,{});assert.equal(m.passed,12);
});
test('Pitfall vine release, crocodile jumps and opening sand lead to the first treasure without a death',()=>{
  const m=new Pitfall(),controller=jungleRoute();let grabs=0;
  for(let i=0;i<120*30&&!m.treasures.size;i++){m.step(dt,controller(m));if(m.events.includes('grab'))grabs++;}
  assert.equal(m.treasures.size,1);assert(m.treasures.has(3));assert.equal(m.lives,3);assert.equal(grabs,1);assert(m.score>3900);
});
test('Pitfall ladders lead to underground exits that move three screens and wrap the jungle',()=>{
  const m=new Pitfall();while(m.x<25.8)m.step(dt,{right:true});run(m,1.5,()=>({down:true}));assert.equal(m.layer,1);assert.equal(m.y,176);
  run(m,.7,()=>({left:true}));assert.equal(m.roomIndex,252);assert.equal(m.layer,1);assert.equal(m.lives,3);
});
test('Pitfall has exactly 32 unique treasure rooms, and repeated hazards and timeout end a run',()=>{
  const rooms=Array.from({length:ROOM_COUNT},(_,i)=>jungleRoom(i));assert.equal(rooms.filter(r=>r.treasure).length,TREASURE_COUNT);
  const m=new Pitfall();for(let i=0;i<3;i++){m.lose('Pit');run(m,1.01);}assert.equal(m.done,true);assert.equal(m.lives,0);
  const n=new Pitfall();n.remaining=.01;run(n,1);assert.equal(n.done,true);assert.equal(n.remaining,0);assert.match(n.message,/Time is up/);
});
