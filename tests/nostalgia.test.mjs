import test from 'node:test';
import assert from 'node:assert/strict';
import {Fishing,fishingPilot,FISH_ROWS} from '../games/shared/nostalgia/fishing.js';
import {Combat,combatPilot,planeContact,hiddenByCloud} from '../games/shared/nostalgia/combat.js';
import {Keystone,elevatorAt,bodyBox,obstacleBox} from '../games/shared/nostalgia/keystone.js';
import {overlap} from '../games/shared/nostalgia/common.js';
import {keystoneRoute} from './fixtures/nostalgia-routes.mjs';

const dt=1/120;
function run(m,seconds,controller=()=>({}),stop=()=>false){for(let f=0;f<seconds*120&&!m.done&&!stop(m);f++)m.tick(dt,controller(m));return m;}

test('fishing: complete legal races to 99 in all three modes',()=>{
  for(const variant of ['calm','classic','expert']){
    const m=run(new Fishing({variant,seed:1981}),180,m=>fishingPilot(m,0));
    assert(m.done&&m.won,variant);assert.equal(m.scores[0],99);assert(m.scores[1]>0);assert(m.landed[0]>=17);assert(m.time>30);assert(m.stolen[0]+m.stolen[1]>0);
  }
});
test('fishing: idle player loses to an opponent who must land fish',()=>{
  const m=run(new Fishing(),180);assert(m.done&&!m.won);assert.equal(m.scores[1],99);assert.equal(m.scores[0],0);assert(m.landed[1]>=17);
});
test('fishing: mouths require contact; six rows carry 2, 4 and 6 pounds',()=>{
  const m=new Fishing();assert.deepEqual([...new Set(m.fish.map(f=>f.y))],FISH_ROWS);assert.deepEqual(m.fish.filter(f=>f.origin===0).map(f=>f.value),[2,2,4,4,6,6]);
  const f=m.fish[0],h=m.hooks[0];f.x=100;f.speed=0;h.x=100;h.y=f.y;m.tick(dt);assert.equal(h.fish,null);
  h.x=108;m.tick(dt);assert.equal(h.fish,0);assert.equal(f.owner,0);
});
test('fishing: first hook has reel priority until landed or eaten',()=>{
  const m=new Fishing();m.think=10;m.cpu={action:true};
  m.hooks.forEach((h,i)=>{h.x=i?330:50;h.y=200;h.fish=i;h.serial=i+1;m.fish[i].owner=i;});
  m.tick(.1,{action:true});assert(Math.abs(m.hooks[0].y-191.2)<.001);assert(Math.abs(m.hooks[1].y-198.5)<.001);
  m.release(0,true);const before=m.hooks[1].y;m.tick(.1);assert(Math.abs(m.hooks[1].y-(before-8.8))<.001);
});
test('fishing: shark contact steals a fish without awarding points',()=>{
  const m=new Fishing();const h=m.hooks[0];h.x=m.shark.x-4;h.y=91;h.fish=0;h.serial=1;m.fish[0].owner=0;
  m.tick(dt);assert.equal(h.fish,null);assert.equal(m.stolen[0],1);assert.deepEqual(m.scores,[0,0]);assert(m.fish[0].cooldown>0);
});
test('combat: normal controls can win each complete 136-second aircraft duel',()=>{
  for(const variant of ['classic','rapid','jets']){
    const m=new Combat({variant});let next=0,input={};
    run(m,137,game=>{if(game.time>=next){input=combatPilot(game,0);next=game.time+(variant==='rapid'?dt:.13);}return input;});
    assert(m.done&&m.won,`${variant}: ${m.scores}`);assert.equal(m.time,136);assert.equal(m.remaining,0);assert(m.scores[0]>=5);assert(m.scores[1]>0);assert(m.shots[0]>m.hitCount[0]);
  }
});
test('combat: one active straight missile, up to three machine-gun shots',()=>{
  for(const variant of ['classic','rapid']){const m=new Combat({variant});m.think=10;m.cpu={};run(m,.45,()=>({action:true}));assert(m.bullets.filter(b=>b.owner===0).length<=(variant==='rapid'?3:1));assert.equal(m.shots[0],variant==='rapid'?3:1);}
});
test('combat: swept hit testing follows solid aircraft and wrapped edges',()=>{
  const p={x:200,y:150,angle:0};assert.notEqual(planeContact(170,150,60,0,p),null);assert.equal(planeContact(205,137,0,2,p),null);
  assert.notEqual(planeContact(380,150,6,0,{x:3,y:150,angle:0}),null);
  const m=new Combat();m.think=10;m.cpu={};m.planes[0].x=383;run(m,.1);assert(m.planes[0].x<15);
});
test('combat: clouds conceal observation without blocking projectile hits',()=>{
  const m=new Combat();m.planes[0].x=100;m.planes[0].y=128;assert(hiddenByCloud(m.planes[0],m.variant));
  const observed={...m.observed[1]};combatPilot(m,1);assert.deepEqual(m.observed[1],observed);
  assert.notEqual(planeContact(70,128,50,0,m.planes[0]),null);
});
test('keystone: nine successive captures with normal inputs, moving elevators and obstacles',()=>{
  const m=run(new Keystone(),260,keystoneRoute,m=>m.level===10);assert.equal(m.arrests,9);assert.equal(m.level,10);assert(m.lives>0);assert(m.score>15000);assert(m.elevatorRides>=9);assert(m.penalties>0);assert(m.loot>0);
});
test('keystone: the escalator route is playable without elevator shortcuts',()=>{
  const m=run(new Keystone(),60,m=>{const c=keystoneRoute(m);if(m.player.floor<m.thief.floor&&!m.player.ride&&!m.player.inLift){const goal=m.player.floor%2===0?1110:42;c.left=goal<m.player.x;c.right=goal>m.player.x;c.up=false;}return c;},m=>m.arrests>0);
  assert.equal(m.arrests,1);assert.equal(m.elevatorRides,0);assert.equal(m.escalatorRides,2);assert(m.remaining>0);
});
test('keystone: ducking clears aircraft, floor obstacles cost nine seconds once',()=>{
  const m=new Keystone(),p=m.player;p.x=200;p.immune=0;
  const plane={type:'plane',x:200,floor:0};assert(overlap(bodyBox(p),obstacleBox(plane,0)));p.duck=true;assert(!overlap(bodyBox(p),obstacleBox(plane,0)));
  m.obstacles=[{type:'radio',x:200,floor:0,speed:0,dir:1,touch:0}];m.tick(dt);assert(Math.abs(m.remaining-(41-dt))<.001);assert.equal(m.lives,4);m.tick(dt);assert(Math.abs(m.remaining-(41-2*dt))<.001);
});
test('keystone: aircraft, expiry and roof escape each consume one life',()=>{
  for(const cause of ['plane','timer','roof']){const m=new Keystone();if(cause==='plane'){m.player.immune=0;m.obstacles=[{type:'plane',x:m.player.x,floor:0,speed:0,dir:1,touch:0}];}if(cause==='timer')m.remaining=dt/2;if(cause==='roof'){m.thief.floor=3;m.thief.x=10;}
    m.tick(dt);assert.equal(m.lives,3,cause);assert(m.transition>0);const lives=m.lives;run(m,1);assert.equal(m.lives,lives);}
});
test('keystone: lift visits only floors 0–2; roof is reached by escalator',()=>{
  for(let t=0;t<24;t+=.1){const e=elevatorAt(t);assert(e.position>=0&&e.position<=2);}
  const m=new Keystone();m.player.floor=2;m.player.x=1110;m.rideStairs(m.player);assert(m.player.ride);run(m,1.2);assert.equal(m.player.floor,3);assert.equal(m.player.ride,null);
  m.player.x=m.liftX;run(m,2,()=>({up:true}));assert(!m.player.inLift);assert.equal(m.player.floor,3);
});
test('keystone: capture multipliers and extra lives follow score thresholds',()=>{
  for(const [level,multiplier]of[[1,100],[8,100],[9,200],[16,200],[17,300]]){const m=new Keystone();m.level=level;m.remaining=12.9;m.arrest();assert.equal(m.score,12*multiplier);}
  const m=new Keystone();m.lives=2;m.addScore(20000);assert.equal(m.lives,4);m.addScore(10000);assert.equal(m.lives,4);
});
test('all new models freeze completely after the round ends',()=>{
  const models=[run(new Fishing(),180),run(new Combat(),137),run(new Keystone(),260)];
  for(const m of models){assert(m.done);const snapshot=JSON.stringify(m);m.tick(5,{action:true,right:true,up:true});assert.equal(JSON.stringify(m),snapshot);}
});
