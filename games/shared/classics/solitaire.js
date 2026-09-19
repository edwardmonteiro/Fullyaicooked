import {clone, integer, random, shuffle} from './common.js';

export const SUITS = ['♥', '♦', '♣', '♠'];
export const SUIT_NAMES = ['copas', 'ouros', 'paus', 'espadas'];
export const rank = id => id % 13 + 1;
export const suit = id => Math.floor(id / 13);
export const red = id => suit(id) < 2;
export const face = id => ({1: 'A', 11: 'J', 12: 'Q', 13: 'K'}[rank(id)] || String(rank(id)));
export const cardName = id => `${({1: 'Ás', 11: 'Valete', 12: 'Dama', 13: 'Rei'}[rank(id)] || rank(id))} de ${SUIT_NAMES[suit(id)]}`;

function validState(s) {
  if (!s || !integer(s.moves, 0, 1000000) || !integer(s.redeals, 0, 100000) || !Array.isArray(s.stock) || !Array.isArray(s.waste) || !Array.isArray(s.tableau) || s.tableau.length !== 7 || !Array.isArray(s.foundations) || s.foundations.length !== 4 || !s.foundations.every(x => integer(x, 0, 13))) return false;
  const ids = [...s.stock, ...s.waste];
  for (const pile of s.tableau) {
    if (!Array.isArray(pile) || pile.length > 52) return false;
    let up = false;
    for (let i = 0; i < pile.length; i++) {
      const c = pile[i];
      if (!c || typeof c.up !== 'boolean' || (up && !c.up)) return false;
      if (up && (rank(pile[i - 1].id) !== rank(c.id) + 1 || red(pile[i - 1].id) === red(c.id))) return false;
      up ||= c.up; ids.push(c.id);
    }
    if (pile.length && !pile.at(-1).up) return false;
  }
  s.foundations.forEach((n, i) => { for (let r = 0; r < n; r++) ids.push(i * 13 + r); });
  return ids.length === 52 && ids.every(x => integer(x, 0, 51)) && new Set(ids).size === 52;
}

export class Solitaire {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    const deck = shuffle(Array.from({length: 52}, (_, i) => i), random(seed));
    this.state = {stock: [], waste: [], foundations: [0, 0, 0, 0], tableau: [], moves: 0, redeals: 0};
    for (let col = 0; col < 7; col++) this.state.tableau.push(Array.from({length: col + 1}, (_, i) => ({id: deck.pop(), up: i === col})));
    this.state.stock = deck;
    this.history = [];
  }
  static restore(value) {
    if (!value || !validState(value.state) || !Array.isArray(value.history) || value.history.length > 200 || !value.history.every(validState) || !integer(value.seed, 0, 0xffffffff)) throw Error('Invalid solitaire save');
    const game = new Solitaire(value.seed); game.state = clone(value.state); game.history = clone(value.history); return game;
  }
  serialize() { return {seed: this.seed, state: clone(this.state), history: clone(this.history)}; }
  get done() { return this.state.foundations.every(n => n === 13); }
  remember() { this.history.push(clone(this.state)); if (this.history.length > 200) this.history.shift(); }
  undo() { if (this.done || !this.history.length) return false; this.state = this.history.pop(); return true; }
  draw() {
    const s = this.state; if (this.done || (!s.stock.length && !s.waste.length)) return false;
    this.remember();
    if (s.stock.length) s.waste.push(s.stock.pop());
    else { s.stock = s.waste.reverse(); s.waste = []; s.redeals++; }
    s.moves++; return true;
  }
  cards(source) {
    const s = this.state;
    if (source?.zone === 'w') return s.waste.length ? [s.waste.at(-1)] : [];
    if (source?.zone === 'f' && integer(source.col, 0, 3)) { const n = s.foundations[source.col]; return n ? [source.col * 13 + n - 1] : []; }
    if (source?.zone !== 't' || !integer(source.col, 0, 6)) return [];
    const pile = s.tableau[source.col];
    if (!integer(source.index, 0, pile.length - 1) || !pile[source.index].up) return [];
    return pile.slice(source.index).map(c => c.id);
  }
  canMove(source, target) {
    if (this.done) return false;
    const cards = this.cards(source); if (!cards.length) return false;
    const id = cards[0];
    if (target?.zone === 'f') return source.zone !== 'f' && cards.length === 1 && target.col === suit(id) && rank(id) === this.state.foundations[target.col] + 1;
    if (target?.zone !== 't' || !integer(target.col, 0, 6) || (source.zone === 't' && source.col === target.col)) return false;
    const top = this.state.tableau[target.col].at(-1);
    return top ? red(top.id) !== red(id) && rank(top.id) === rank(id) + 1 : rank(id) === 13;
  }
  move(source, target, remember = true) {
    if (!this.canMove(source, target)) return false;
    if (remember) this.remember();
    const s = this.state, cards = this.cards(source);
    if (source.zone === 'w') s.waste.pop();
    else if (source.zone === 'f') s.foundations[source.col]--;
    else { const pile = s.tableau[source.col]; pile.splice(source.index); if (pile.length) pile.at(-1).up = true; }
    if (target.zone === 'f') s.foundations[target.col]++;
    else s.tableau[target.col].push(...cards.map(id => ({id, up: true})));
    s.moves++; return true;
  }
  sources() {
    const result = [];
    this.state.tableau.forEach((pile, col) => pile.forEach((card, index) => { if (card.up) result.push({zone: 't', col, index}); }));
    if (this.state.waste.length) result.push({zone: 'w'});
    this.state.foundations.forEach((n, col) => { if (n) result.push({zone: 'f', col}); });
    return result;
  }
  safeHome(id) {
    return rank(id) <= 2 || this.state.foundations.every((n, s) => (s < 2) === red(id) || n >= rank(id) - 1);
  }
  options() {
    const options = [];
    for (const source of this.sources()) {
      const id = this.cards(source)[0], reveal = source.zone === 't' && source.index > 0 && !this.state.tableau[source.col][source.index - 1].up;
      for (const zone of ['f', 't']) for (let col = 0; col < (zone === 'f' ? 4 : 7); col++) {
        const target = {zone, col}; if (!this.canMove(source, target)) continue;
        // Moving a whole exposed king pile into another empty column changes nothing.
        if (zone === 't' && !this.state.tableau[col].length && source.zone === 't' && source.index === 0) continue;
        const score = (reveal ? 90 : 0) + (zone === 'f' ? (this.safeHome(id) ? 100 : 5) : 0) + (source.zone === 'w' ? 40 : 0) - (source.zone === 'f' ? 80 : 0);
        options.push({source, target, score});
      }
    }
    return options.sort((a, b) => b.score - a.score);
  }
  auto() {
    if (this.done) return 0;
    const before = clone(this.state); let count = 0;
    for (;;) {
      const option = this.options().find(o => o.target.zone === 'f' && this.safeHome(this.cards(o.source)[0]));
      if (!option) break; this.move(option.source, option.target, false); count++;
    }
    if (count) { this.history.push(before); if (this.history.length > 200) this.history.shift(); }
    return count;
  }
}
