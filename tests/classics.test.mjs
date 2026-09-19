import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Solitaire,rank,red} from '../games/shared/classics/solitaire.js';
import {Domino,chooseDomino,points} from '../games/shared/classics/domino.js';
import {WordSearch,THEMES,pathBetween} from '../games/shared/classics/words.js';
import {readSave,writeSave,STORAGE} from '../games/shared/classics/common.js';

test('Klondike has a complete legal route from a standard shuffled 52-card deal',async()=>{
  const route=JSON.parse(await readFile(new URL('./fixtures/solitaire-route.json',import.meta.url),'utf8'));
  const game=new Solitaire(route.seed);
  assert.equal(game.state.stock.length,24);assert.deepEqual(game.state.tableau.map(p=>p.length),[1,2,3,4,5,6,7]);
  for(const action of route.actions){assert(!game.done);assert(action.draw?game.draw():game.move(action.source,action.target));Solitaire.restore(game.serialize());}
  assert(game.done);assert.deepEqual(game.state.foundations,[13,13,13,13]);assert.equal(game.state.stock.length,0);
  const final=game.serialize();assert.equal(game.draw(),false);assert.equal(game.undo(),false);assert.equal(game.auto(),0);assert.deepEqual(game.serialize(),final);
});
test('Klondike draw-one, redeal order and undo preserve the exact deck',()=>{
  const game=new Solitaire(16),start=game.serialize();assert(game.draw());assert.equal(game.state.waste.length,1);assert(game.undo());assert.deepEqual(game.serialize(),start);
  const order=[];while(game.state.stock.length){game.draw();order.push(game.state.waste.at(-1));}game.draw();assert.equal(game.state.redeals,1);
  for(const id of order){game.draw();assert.equal(game.state.waste.at(-1),id);}
  assert.equal(game.state.stock.length,0);assert.equal(game.state.waste.length,24);Solitaire.restore(game.serialize());
});
test('Klondike rejects invalid moves and undo restores hidden cards after a reveal',()=>{
  const game=new Solitaire(1);const hidden={zone:'t',col:6,index:0};assert.equal(game.move(hidden,{zone:'f',col:0}),false);
  assert.equal(game.move({zone:'w'},{zone:'t',col:99}),false);
  const candidate=game.options().find(o=>o.source.zone==='t'&&o.source.index>0);assert(candidate);
  const before=game.serialize(),moved=game.cards(candidate.source);
  if(candidate.target.zone==='t'){const top=game.state.tableau[candidate.target.col].at(-1);assert.equal(rank(top.id),rank(moved[0])+1);assert.notEqual(red(top.id),red(moved[0]));}
  assert(game.move(candidate.source,candidate.target));assert(game.state.tableau[candidate.source.col].at(-1).up);assert(game.undo());assert.deepEqual(game.serialize(),before);
});
test('all domino difficulties finish complete games and never lose or duplicate tiles',()=>{
  const outcomes=new Set(),reasons=new Set();
  for(let level=0;level<3;level++)for(let seed=1;seed<=40;seed++){
    const game=new Domino(seed,level);let actions=0;
    while(!game.done&&actions++<150){
      if(game.turn===1)assert(game.computerStep());
      else{const move=chooseDomino(game.view(),2,()=>.31);if(move)assert(game.play(move.id,move.side));else if(game.stock.length)assert.notEqual(game.draw(),null);else assert(game.pass());}
      Domino.restore(game.serialize());
    }
    assert(game.done);assert(actions<150);outcomes.add(game.winner);reasons.add(game.reason);
    if(game.reason==='blocked'){const p=game.hands.map(h=>h.reduce((s,id)=>s+points(id),0));assert.equal(game.winner,p[0]===p[1]?-1:p[0]<p[1]?0:1);}
    const done=game.serialize();assert.equal(game.computerStep(),false);assert.equal(game.draw(),null);assert.equal(game.pass(),false);assert.deepEqual(game.serialize(),done);
  }
  assert(outcomes.has(0)&&outcomes.has(1));assert(reasons.has('blocked')&&reasons.has('empty'));
});
test('domino opening, buying, passing and out-of-turn restrictions are enforced',()=>{
  const game=new Domino(77);const first=game.legal()[0];assert.equal(first.id,game.opening);assert.equal(game.draw(),null);assert.equal(game.pass(),false);
  const before=game.serialize();assert.equal(game.play(first.id,'right',1-game.turn),false);assert.deepEqual(game.serialize(),before);
  assert(game.play(first.id,'right'));const view=game.view();assert.deepEqual(Object.keys(view).sort(),['chain','hand','moves']);assert(!('stock' in view));assert(!('hands' in view));
  for(let level=0;level<3;level++){const move=chooseDomino(view,level,()=>.7);if(move)assert(view.moves.some(m=>m.id===move.id&&m.side===move.side));}
});
test('every theme and level generates complete, solvable word grids with legal selections',()=>{
  for(const theme of Object.keys(THEMES))for(let level=0;level<3;level++)for(let seed=1;seed<=12;seed++){
    const game=new WordSearch(seed,theme,level);assert.equal(game.words.length,[6,8,10][level]);assert.equal(game.size,[8,10,12][level]);
    for(const [i,w] of game.words.entries()){
      assert.equal(w.cells.map(([r,c])=>game.grid[r][c]).join(''),w.word);
      assert(game.select(i%2?w.cells.at(-1):w.cells[0],i%2?w.cells[0]:w.cells.at(-1)));
      WordSearch.restore(game.serialize());
    }
    assert(game.done);assert.equal(game.hint(),null);assert.equal(game.select([0,0],[0,1]),null);
  }
});
test('word search accepts the matching text, rejects bent paths and counts each word once',()=>{
  const game=new WordSearch(3,'Música',2),w=game.words[0];assert.deepEqual(pathBetween([0,0],[2,1],game.size),[]);
  assert.equal(game.select([-1,0],[2,0]),null);const hint=game.hint();assert.equal(game.found.length,0);assert.deepEqual(hint.cell,w.cells[0]);
  assert(game.select(w.cells[0],w.cells.at(-1)));assert.equal(game.select(w.cells[0],w.cells.at(-1)),null);assert.equal(game.found.length,1);
  const loaded=WordSearch.restore(game.serialize());assert.deepEqual(loaded.grid,game.grid);assert.deepEqual(loaded.found,game.found);
});
test('saved rounds resume independently; malformed saves cannot corrupt the earlier games',()=>{
  const records=new Map([['cooked:campaign:v2:neon-rally','unchanged']]);const storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
  for(const [kind,Type]of [['paciencia',Solitaire],['domino',Domino],['caca-palavras',WordSearch]]){
    const model=new Type(52);if(kind==='paciencia')model.draw();if(kind==='domino'){const m=model.legal()[0];model.play(m.id,m.side);}if(kind==='caca-palavras'){const w=model.words[0];model.select(w.cells[0],w.cells.at(-1));}
    assert(writeSave(storage,kind,model,false));assert.deepEqual(readSave(storage,kind,Type.restore).model.serialize(),model.serialize());
    records.set(STORAGE+kind,'{"version":1,"model":{}}');assert.equal(readSave(storage,kind,Type.restore),null);
  }
  assert.equal(records.get('cooked:campaign:v2:neon-rally'),'unchanged');assert.equal(writeSave({setItem(){throw Error('quota');}},'paciencia',new Solitaire(1),false),false);
});
test('save validation rejects duplicated cards, broken domino chains and forged word completion',()=>{
  const cards=new Solitaire(1).serialize();cards.state.stock[1]=cards.state.stock[0];assert.throws(()=>Solitaire.restore(cards));
  const domino=new Domino(1);const first=domino.legal()[0];domino.play(first.id,first.side);const tiles=domino.serialize();tiles.chain[0].a=9;assert.throws(()=>Domino.restore(tiles));
  const words=new WordSearch(1).serialize();words.found=[{index:0,cells:[[0,0]]}];assert.throws(()=>WordSearch.restore(words));
});
