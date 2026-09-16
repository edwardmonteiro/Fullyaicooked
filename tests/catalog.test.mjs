import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverGames } from '../scripts/catalog.mjs';
import { overlap, intersects, circleRect } from '../games/shared/physics.js';

test('catalog finds bundles and standalone HTML, excluding app and hidden files', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'arcade-'));
  try {
    for(const dir of ['games/a','web','android','.hidden','legacy'])await mkdir(path.join(root,dir),{recursive:true});
    for(const file of ['games/a/index.html','games/a/help.html','web/index.html','android/index.html','.hidden/index.html','legacy/solo.html'])await writeFile(path.join(root,file),'<title>A game</title>');
    await writeFile(path.join(root,'games/a/game.json'),JSON.stringify({id:'a',title:'A',category:'Puzzle'}));
    const games=await discoverGames(root);
    assert.equal(games.length,2);assert.equal(games[0].title,'A');assert.equal(games[0].entry,'content/games/a/index.html');assert(games.some(g=>g.entry==='content/legacy/solo.html'));
  } finally {await rm(root,{recursive:true,force:true});}
});
test('catalog rejects a manifest path that escapes its bundle',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'arcade-'));
  try{await mkdir(path.join(root,'games/a'),{recursive:true});await writeFile(path.join(root,'games/a/game.json'),JSON.stringify({entry:'../../outside.html'}));await assert.rejects(()=>discoverGames(root),/Invalid game entry/);}finally{await rm(root,{recursive:true,force:true});}
});
test('stacking collision trims only the true overlap and rejects misses',()=>{
  assert.deepEqual(overlap({x:100,w:80},{x:140,w:80}),{x:140,w:40});
  assert.equal(overlap({x:0,w:30},{x:31,w:30}).w,0);
  assert.equal(overlap({x:20,w:70},{x:20,w:70}).w,70);
});
test('racing vehicles do not collide at a distance; brick contacts include ball radius',()=>{
  assert.equal(intersects({x:40,y:20,w:30,h:50},{x:80,y:20,w:30,h:50}),false);
  assert.equal(intersects({x:40,y:20,w:30,h:50},{x:60,y:50,w:30,h:50}),true);
  assert.equal(circleRect({x:10,y:10,r:5},{x:15,y:8,w:20,h:8}),true);
  assert.equal(circleRect({x:10,y:10,r:4},{x:15,y:8,w:20,h:8}),false);
});
