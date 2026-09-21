import {clone, integer, random, shuffle} from './common.js';

export const TILES = Array.from({length: 7}, (_, a) => Array.from({length: 7 - a}, (_, n) => [a, n + a])).flat();
export const points = id => TILES[id][0] + TILES[id][1];
export const tileName = id => TILES[id].join(' e ');
export function chooseDomino(view, level = 1, rng = Math.random) {
  // Only the public chain, legal moves and this player's hand enter the AI.
  const {hand, chain, moves} = view; if (!moves.length) return null;
  if (level === 0) return moves[Math.floor(rng() * moves.length)];
  const known = new Set([...hand, ...chain.map(t => t.id)]);
  const unseen = TILES.map((_, i) => i).filter(id => !known.has(id));
  const scores = moves.map(move => {
    const [a, b] = TILES[move.id], end = chain.length ? (move.side === 'left' ? chain[0].a : chain.at(-1).b) : a;
    const newEnd = a === end ? b : a, otherEnd = chain.length ? (move.side === 'left' ? chain.at(-1).b : chain[0].a) : a;
    const remaining = hand.filter(id => id !== move.id);
    const support = remaining.filter(id => TILES[id].includes(newEnd) || TILES[id].includes(otherEnd)).length;
    const replies = unseen.filter(id => TILES[id].includes(newEnd) || TILES[id].includes(otherEnd)).length;
    return {move, score: points(move.id) + (a === b ? 3 : 0) + support * (level === 2 ? 3 : 1) - (level === 2 ? replies * 1.6 : 0)};
  });
  scores.sort((a, b) => b.score - a.score); return scores[0].move;
}

export class Domino {
  constructor(seed = 1, level = 1) {
    this.seed = seed >>> 0; this.level = integer(level, 0, 2) ? level : 1;
    const deck = shuffle(TILES.map((_, i) => i), random(seed));
    this.hands = [deck.splice(0, 7), deck.splice(0, 7)]; this.stock = deck; this.chain = []; this.passes = 0; this.moves = 0; this.done = false; this.winner = null; this.reason = '';
    const dealt = this.hands.flat();
    const doubles = dealt.filter(id => TILES[id][0] === TILES[id][1]).sort((a, b) => points(b) - points(a));
    this.opening = doubles[0] ?? [...dealt].sort((a, b) => points(b) - points(a) || b - a)[0];
    this.turn = this.hands[0].includes(this.opening) ? 0 : 1;
    this.last = this.turn === 0 ? 'Você começa com a maior dupla disponível.' : 'O computador começa.';
  }
  static restore(v) {
    if (!v || !integer(v.seed, 0, 0xffffffff) || !integer(v.level, 0, 2) || !integer(v.turn, 0, 1) || !integer(v.moves, 0, 10000) || !integer(v.passes, 0, 2) || !Array.isArray(v.hands) || v.hands.length !== 2 || !v.hands.every(Array.isArray) || !Array.isArray(v.stock) || !Array.isArray(v.chain) || typeof v.done !== 'boolean' || ![null, 0, 1, -1].includes(v.winner) || typeof v.last !== 'string' || v.last.length > 240 || !integer(v.opening, 0, 27) || !['', 'empty', 'blocked'].includes(v.reason)) throw Error('Invalid domino save');
    const ids = [...v.hands.flat(), ...v.stock, ...v.chain.map(t => t.id)];
    if (ids.length !== 28 || new Set(ids).size !== 28 || !ids.every(id => integer(id, 0, 27))) throw Error('Invalid tiles');
    v.chain.forEach((tile, i) => { const [a, b] = TILES[tile.id]; if (!((tile.a === a && tile.b === b) || (tile.a === b && tile.b === a)) || (i && v.chain[i - 1].b !== tile.a)) throw Error('Broken chain'); });
    const game = new Domino(v.seed, v.level);
    for (const key of ['hands', 'stock', 'chain', 'passes', 'moves', 'done', 'winner', 'reason', 'opening', 'turn', 'last']) game[key] = clone(v[key]);
    if ((!game.done && (game.hands.some(h => !h.length) || game.passes === 2 || game.winner !== null)) || (game.done && !['empty', 'blocked'].includes(game.reason)) || (!game.chain.length && !game.hands[game.turn].includes(game.opening))) throw Error('Invalid turn');
    if (game.done) {
      const totals = game.hands.map(h => h.reduce((sum, id) => sum + points(id), 0));
      const expected = game.reason === 'empty' ? game.hands.findIndex(h => !h.length) : totals[0] === totals[1] ? -1 : totals[0] < totals[1] ? 0 : 1;
      if (game.winner !== expected || (game.reason === 'empty' && expected < 0) || (game.reason === 'blocked' && (game.stock.length || game.passes !== 2))) throw Error('Invalid result');
    }
    return game;
  }
  serialize() { return clone({...this}); }
  legal(player = this.turn) {
    if (this.done) return [];
    if (!this.chain.length) return this.hands[player].includes(this.opening) ? [{id: this.opening, side: 'right'}] : [];
    const left = this.chain[0].a, right = this.chain.at(-1).b, result = [];
    for (const id of this.hands[player]) {
      if (TILES[id].includes(left)) result.push({id, side: 'left'});
      if (TILES[id].includes(right)) result.push({id, side: 'right'});
    }
    return result;
  }
  play(id, side, player = this.turn) {
    if (player !== this.turn || !this.legal(player).some(m => m.id === id && m.side === side)) return false;
    let [a, b] = TILES[id];
    this.hands[player].splice(this.hands[player].indexOf(id), 1);
    if (side === 'left' && this.chain.length) { if (b !== this.chain[0].a) [a, b] = [b, a]; this.chain.unshift({id, a, b}); }
    else { if (this.chain.length && a !== this.chain.at(-1).b) [a, b] = [b, a]; this.chain.push({id, a, b}); }
    this.last = `${player === 0 ? 'Você jogou' : 'Computador jogou'} ${tileName(id)}.`; this.moves++; this.passes = 0;
    if (!this.hands[player].length) { this.done = true; this.winner = player; this.reason = 'empty'; }
    else this.turn = 1 - player;
    return true;
  }
  draw(player = this.turn) {
    if (this.done || player !== this.turn || this.legal(player).length || !this.stock.length) return null;
    const id = this.stock.pop(); this.hands[player].push(id); this.moves++;
    this.last = player === 0 ? `Você comprou ${tileName(id)}.` : 'Computador comprou uma peça.';
    return id;
  }
  pass(player = this.turn) {
    if (this.done || player !== this.turn || this.legal(player).length || this.stock.length) return false;
    this.passes++; this.moves++; this.last = `${player === 0 ? 'Você passou' : 'Computador passou'}.`;
    if (this.passes >= 2) {
      const totals = this.hands.map(hand => hand.reduce((sum, id) => sum + points(id), 0));
      this.done = true; this.reason = 'blocked'; this.winner = totals[0] === totals[1] ? -1 : totals[0] < totals[1] ? 0 : 1;
    } else this.turn = 1 - player;
    return true;
  }
  view(player = this.turn) { return {hand: [...this.hands[player]], chain: clone(this.chain), moves: this.legal(player)}; }
  computerStep() {
    if (this.turn !== 1 || this.done) return false;
    const move = chooseDomino(this.view(), this.level, random(this.seed + this.moves));
    if (move) return this.play(move.id, move.side);
    if (this.stock.length) return this.draw() !== null;
    return this.pass();
  }
}
