import test from 'node:test';
import assert from 'node:assert/strict';
import {Starfall,Rider,Bastion,MODELS,LANES} from '../games/shared/mobile/models.js';
import {pilot,driver,defender} from './fixtures/mobile-routes.mjs';
import {readProgress,saveResult} from '../games/shared/progress.js';
import {discoverGames} from '../scripts/catalog.mjs';
const step=(m,seconds,control=()=>({}),dt=1/120)=>{for(let n=0;n<Math.round(seconds/dt)&&!m.done;n++){m.tick(dt,control(m));m.events.length=0;}return m;};
for(const [Game,control] of [[Starfall,pilot],[Rider,driver],[Bastion,defender]])test(`${Game.name}: all three missions have complete legal-input winning routes`,()=>{
 for(let level=0;level<3;level++){const m=step(new Game(level),180,control);assert.equal(m.won,true,`mission ${level+1} must be winnable`);assert(m.hull>0);assert(m.score>3000);assert(m.time>=30&&m.time<110);assert(m.medal>=1&&m.medal<=3);if(Game===Starfall){assert(m.boss.hp<=0);assert(m.kills>=20);}if(Game===Rider){assert.equal(m.hits,0);assert.equal(m.checkpoint,3);assert(m.rows>=20);}if(Game===Bastion){assert(m.stopped>=45);assert.equal(m.wave,m.waves-1);}}
});
test('ignoring danger loses every game; terminal states stop scoring and movement',()=>{
 for(const Game of Object.values(MODELS)){const m=step(new Game(2),180);assert(m.done&&!m.won);const snapshot=JSON.stringify(m);m.tick(10,{action:true,fire:true,left:true});assert.equal(JSON.stringify(m),snapshot);}
});
test('ship drag is speed-limited; pulse clears bullets, consumes charges and cannot be reused for free',()=>{
 const m=new Starfall();m.tick(1/120,{targetX:360,targetY:100});assert(m.x<184);assert(m.y>478);
 m.bullets.push({x:180,y:300,vx:0,vy:100});m.tick(1/120,{action:true});assert.equal(m.bullets.length,0);assert.equal(m.charges,1);m.tick(1/120,{action:true});assert.equal(m.charges,0);m.bullets.push({x:0,y:0,vx:0,vy:100});m.tick(1/120,{action:true});assert.equal(m.bullets.length,1);
});
test('ship collision invulnerability expires and pickups provide distinct effects',()=>{
 const m=new Starfall();m.hit();m.hit();assert.equal(m.hull,2);step(m,2);m.hit();assert.equal(m.hull,1);
 m.pickups.push({x:m.x,y:m.y,type:'shield'},{x:m.x,y:m.y,type:'power'});m.tick(1/120);assert(m.power>8&&m.shield>11);m.invulnerable=0;m.hit();assert.equal(m.hull,1);assert.equal(m.shield,0);
});
test('rider leaves an open lane, limits lane changes and uses energy to gain distance',()=>{
 const normal=step(new Rider(),8),boost=step(new Rider(),8,()=>({action:true}));assert(boost.distance>normal.distance+250);assert(boost.energy<normal.energy);assert(normal.rowHistory.length>1);
 const m=new Rider(2);step(m,20,driver);for(let i=1;i<m.rowHistory.length;i++)assert(Math.abs(m.rowHistory[i].safe-m.rowHistory[i-1].safe)<=1);
 const before=m.x;m.tick(1/120,{lane:8});assert.equal(m.lane,2);assert(m.x-before<=520/120+.01);assert(LANES.includes(m.traffic[0]?.x));
});
test('defense spends/recharges energy, caps firing and gives blasts finite lifetimes',()=>{
 const m=new Bastion();assert(m.launch(100,200));assert.equal(m.energy,5);assert(!m.launch(100,200));step(m,.5);assert(m.energy>5);assert(m.blasts.length>0||m.interceptors.length>0);step(m,1.8);assert.equal(m.blasts.length,0);
 m.energy=0;assert(!m.launch(100,200));m.tick(1/120,{action:true});assert.equal(m.emp,0);
});
test('defense splitters fork into threats for living cities and explosions chain',()=>{
 const m=new Bastion(1);m.missiles=[{x:180,y:201,ox:180,oy:0,target:1,speed:70,split:true}];step(m,.1);assert.equal(m.missiles.length,2);assert.deepEqual(m.missiles.map(x=>x.target),[0,2]);
 m.explode(180,210);m.missiles=[{x:190,y:210,ox:190,oy:0,target:1,speed:50},{x:220,y:215,ox:220,oy:0,target:1,speed:50}];step(m,.5);assert.equal(m.missiles.length,0);assert(m.bestChain>=1);assert(m.score>=280);
});
test('completed missions persist and unlock independently without damaging existing campaigns',()=>{
 const records=new Map([['cooked:campaign:v2:neon-rally','keep']]);const storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
 for(const kind of Object.keys(MODELS)){const progress=readProgress(storage,kind,3);saveResult(storage,kind,progress,0,{won:true,medal:2,score:2345});const loaded=readProgress(storage,kind,3);assert.equal(loaded.unlocked,1);assert.equal(loaded.medals[0],2);assert.equal(loaded.scores[0],2345);}
 assert.equal(records.get('cooked:campaign:v2:neon-rally'),'keep');
});
test('catalog includes twenty-one unique games and all three new portrait bundles',async()=>{const games=await discoverGames(process.cwd());assert.equal(games.length,21);assert.equal(new Set(games.map(g=>g.id)).size,21);for(const kind of Object.keys(MODELS)){const g=games.find(g=>g.id===kind);assert(g);assert.equal(g.orientation,'portrait');assert(g.cover.endsWith('/cover.webp'));}});
