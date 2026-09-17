import test from 'node:test';
import assert from 'node:assert/strict';
import {Rally,Breaker,Stack,TriathlonRace,BikeTrial,GolfCup,CAMPAIGNS} from '../games/shared/championship.js';
import {Golf,COURSES} from '../games/shared/sports/models.js';
import {readProgress,saveResult} from '../games/shared/progress.js';
const advance=(game,seconds,input={})=>{for(let i=0;i<seconds*120&&!game.done;i++)game.tick(1/120,typeof input==='function'?input(game):input);};
test('all four rally circuits allow a clean route to every checkpoint',()=>{
 for(let level=0;level<4;level++){
  const g=new Rally(level);advance(g,160,g=>{const c=g.center(492),dangers=g.objects.filter(o=>o.kind==='car'&&o.y>330&&o.y<580);const lanes=[c-94,c,c+94].sort((a,b)=>Math.abs(a-g.x)-Math.abs(b-g.x));return {targetX:lanes.find(x=>dangers.every(o=>Math.abs(o.x-x)>47))??g.x,pace:g.energy>30&&!dangers.length};});
  assert(g.won,`circuit ${level+1} must be reachable`);assert.equal(g.checkpoint,4);assert(g.remaining>0);
 }
});
test('rally nitro spends charge, brakes slow the car, collisions consume one life',()=>{
 const fast=new Rally(),slow=new Rally();advance(fast,1,{pace:true});advance(slow,1,{brake:true});assert(fast.speed>slow.speed*1.5);assert(fast.energy<75);
 fast.objects=[{x:fast.x,lane:0,offset:fast.x-fast.center(492),y:490,kind:'car',age:0,shift:0},{x:fast.x,lane:0,offset:fast.x-fast.center(492),y:491,kind:'car',age:0,shift:0}];fast.tick(1/120);assert.equal(fast.hearts,3);
});
test('breaker armor needs multiple contacts, capsules alter play, all sectors are finishable',()=>{
 const armor=new Breaker(1),brick=armor.bricks.find(b=>b.hp===2);armor.damage(brick);assert(brick.live);assert.equal(brick.hp,1);armor.damage(brick);assert(!brick.live);
 armor.action();armor.power('M');assert.equal(armor.balls.length,3);armor.power('W');armor.tick(1/120);assert.equal(armor.paddle.w,155);armor.power('S');armor.balls=[{x:40,y:577,vx:0,vy:350,r:7,trail:[]}];armor.tick(.02);assert.equal(armor.shield,1);assert(armor.ball.vy<0);
 for(let level=0;level<5;level++){const g=new Breaker(level);advance(g,300,g=>{const b=g.balls.filter(b=>b.vy>0).sort((a,b)=>b.y-a.y)[0]||g.ball;return {action:g.waiting,targetX:b.x+Math.sin(g.time*1.8)*23};});assert(g.won,`sector ${level+1}`);assert.equal(g.broken,g.initial);}
});
test('stack focus costs energy, misses trim width, perfect combos restore it',()=>{
 const g=new Stack();const oldX=g.current.x;advance(g,.2,{focus:true});assert(g.energy<100);assert(g.current.x-oldX<12);
 g.current={x:120,w:220};g.land();assert.equal(g.blocks.at(-1).w,200);
 for(let i=0;i<3;i++){g.current={...g.blocks.at(-1)};g.land();}assert.equal(g.blocks.at(-1).w,214);assert.equal(g.perfects,3);
 for(let level=0;level<4;level++){const tower=new Stack(level);advance(tower,100,g=>({action:g.phase==='move'&&Math.abs(g.blocks.at(-1).x-g.current.x)<1.6}));assert(tower.won);assert.equal(tower.blocks.length-1,tower.goal);}
});
test('triathlon drafting conserves stamina and every championship has a qualifying route',()=>{
 const draft=new TriathlonRace(),solo=new TriathlonRace();draft.rivals=[{distance:7,x:210,baseX:210,factor:1,index:0}];solo.rivals=[];advance(draft,.5,{pace:true});advance(solo,.5,{pace:true});assert(draft.energy>solo.energy+4);
 for(let level=0;level<3;level++){const g=new TriathlonRace(level),legs=new Set();advance(g,130,g=>{legs.add(g.leg);const hazards=g.objects.filter(o=>!o.pickup&&o.y>310&&o.y<550);const x=[60,150,265,360].sort((a,b)=>Math.abs(a-g.x)-Math.abs(b-g.x)).find(x=>hazards.every(o=>Math.abs(o.x-x)>36))??g.x;return {targetX:x,pace:g.energy>32};});assert.deepEqual([...legs],[0,1,2]);assert(g.won);assert(g.rank<=3);}
});
test('all bike trails and gaps can be cleared with unmodified jump physics',()=>{
 for(let level=0;level<3;level++){const g=new BikeTrial(level);advance(g,100,g=>({pedal:true,action:g.grounded&&(g.obstacles.some(r=>!r.hit&&r.x>g.x&&r.x-g.x<100)||g.gaps.some(([a])=>a>g.x&&a-g.x<55))}));assert(g.won,`trail ${level+1}`);assert.equal(g.crashes,0);assert(g.checkpointX>1400);}
 const g=new BikeTrial(1);g.checkpointX=1500;g.x=1800;g.crash('test landing');assert.equal(g.x,1500);assert.equal(g.hearts,2);
});
test('golf aiming is side-effect free and cups stop after exactly three holes',()=>{
 const g=new GolfCup(2),before=JSON.stringify(g);assert(g.trajectory(120,-450).length>2);assert.equal(JSON.stringify(g),before);
 for(let i=0;i<3;i++){const [x,y]=g.course.cup;Object.assign(g.ball,{x,y:y+22});g.shoot(0,-60);advance(g,2.5);}assert(g.won);assert.equal(g.cards.length,3);assert.equal(g.hole,8);assert.equal(g.medal,3);
 const gate=new Golf();gate.hole=6;gate.loadHole();const x=gate.walls.at(-1).x;advance(gate,1);assert.notEqual(gate.walls.at(-1).x,x);
});
test('campaign saves unlock the next event, preserve medals, and reject malformed progress',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};let p=readProgress(storage,'bike-rider',3);assert.equal(p.unlocked,0);
 saveResult(storage,'bike-rider',p,0,{won:true,medal:3,score:1900});p=readProgress(storage,'bike-rider',3);assert.equal(p.unlocked,1);assert.equal(p.medals[0],3);
 saveResult(storage,'bike-rider',p,0,{won:false,medal:0,score:100});assert.equal(p.medals[0],3);assert.equal(p.scores[0],1900);
 data.set('cooked:campaign:v2:bike-rider','{"unlocked":999,"medals":[0],"scores":["NaN"]}');p=readProgress(storage,'bike-rider',3);assert.equal(p.unlocked,0);assert.deepEqual(p.scores,[0,0,0]);
 assert.equal(Object.values(CAMPAIGNS).reduce((n,c)=>n+c.stages.length,0),22);assert.equal(COURSES.length,9);
});
test('each of the nine greens has a legal stroke route within par',async()=>{
 const {readFile}=await import('node:fs/promises');const routes=JSON.parse(await readFile(new URL('./fixtures/golf-routes.json',import.meta.url),'utf8'));
 for(const route of routes){const g=new Golf();g.hole=route.hole;g.loadHole();for(const shot of route.path){assert(g.shoot(Math.cos(shot.angle)*shot.power,Math.sin(shot.angle)*shot.power));for(let i=0;i<600&&g.phase==='play'&&g.moving;i++)g.tick(1/120);}
 assert.equal(g.phase,'holed',`green ${route.hole+1}`);assert(g.strokes<=g.course.par);}
});
