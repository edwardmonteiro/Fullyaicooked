import {clone, integer, random, shuffle} from './common.js';

export const THEMES = {
  Jardim: ['ROSA', 'LÍRIO', 'HORTA', 'FOLHA', 'FLOR', 'SOL', 'VASO', 'TERRA', 'SEMENTE', 'ÁRVORE', 'JARDIM', 'REGADOR'],
  Cozinha: ['ARROZ', 'FEIJÃO', 'CAFÉ', 'BOLO', 'PÃO', 'SAL', 'PRATO', 'FORNO', 'PANELA', 'COLHER', 'FRUTA', 'LEITE'],
  Animais: ['GATO', 'PATO', 'SAPO', 'VACA', 'LEÃO', 'URSO', 'PEIXE', 'CAVALO', 'COELHO', 'TUCANO', 'GALINHA', 'BALEIA'],
  Viagem: ['PRAIA', 'MAR', 'RIO', 'TREM', 'MAPA', 'MALA', 'BARCO', 'HOTEL', 'PONTE', 'ESTRADA', 'VIAGEM', 'CIDADE'],
  Música: ['VIOLA', 'PIANO', 'SAMBA', 'VOZ', 'SOM', 'NOTA', 'RÁDIO', 'FLAUTA', 'CANÇÃO', 'TAMBOR', 'VIOLÃO', 'MELODIA'],
  Casa: ['MESA', 'SOFÁ', 'CAMA', 'PORTA', 'LIVRO', 'LAR', 'JANELA', 'TAPETE', 'RELÓGIO', 'QUADRO', 'CADEIRA', 'VARANDA']
};
export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
export function pathBetween(start, end, size) {
  if (![...start, ...end].every(x => integer(x, 0, size - 1))) return [];
  const dr = end[0] - start[0], dc = end[1] - start[1];
  if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return [];
  return Array.from({length: Math.max(Math.abs(dr), Math.abs(dc)) + 1}, (_, i) => [start[0] + Math.sign(dr) * i, start[1] + Math.sign(dc) * i]);
}

export class WordSearch {
  constructor(seed = 1, theme = 'Jardim', level = 0) {
    this.seed = seed >>> 0; this.theme = Object.hasOwn(THEMES, theme) ? theme : 'Jardim'; this.level = integer(level, 0, 2) ? level : 0;
    this.size = [8, 10, 12][this.level]; this.found = []; this.hints = 0;
    const rng = random(seed), count = [6, 8, 10][this.level];
    const selected = shuffle(THEMES[this.theme], rng).slice(0, count);
    // Backtracking places every requested word; fill letters never replace a placed letter.
    this.grid = Array.from({length: this.size}, () => Array(this.size).fill(''));
    this.words = [];
    const ordered = [...selected].sort((a, b) => b.length - a.length);
    const place = index => {
      if (index === ordered.length) return true;
      const label = ordered[index], word = normalize(label), choices = [];
      const directions = DIRECTIONS.slice(0, [2, 4, 8][this.level]);
      for (let r = 0; r < this.size; r++) for (let c = 0; c < this.size; c++) for (const [dr, dc] of directions) {
        const end = [r + dr * (word.length - 1), c + dc * (word.length - 1)];
        const cells = pathBetween([r, c], end, this.size);
        if (cells.length === word.length && cells.every(([y, x], i) => !this.grid[y][x] || this.grid[y][x] === word[i])) choices.push(cells);
      }
      for (const cells of shuffle(choices, rng)) {
        const before = cells.map(([r, c]) => this.grid[r][c]);
        cells.forEach(([r, c], i) => { this.grid[r][c] = word[i]; });
        this.words.push({label, word, cells});
        if (place(index + 1)) return true;
        this.words.pop(); cells.forEach(([r, c], i) => { this.grid[r][c] = before[i]; });
      }
      return false;
    };
    if (!place(0)) throw Error('Could not place words');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.grid.forEach(row => row.forEach((cell, c) => { if (!cell) row[c] = alphabet[Math.floor(rng() * alphabet.length)]; }));
    this.words.sort((a, b) => selected.indexOf(a.label) - selected.indexOf(b.label));
  }
  static restore(v) {
    if (!v || !integer(v.seed, 0, 0xffffffff) || !Object.hasOwn(THEMES, v.theme) || !integer(v.level, 0, 2) || !integer(v.hints, 0, 100000) || !Array.isArray(v.found) || v.found.length > 10) throw Error('Invalid word save');
    // Regenerate from the seed instead of trusting arbitrary persisted grids or answer locations.
    const game = new WordSearch(v.seed, v.theme, v.level);
    const unique = new Set();
    for (const item of v.found) {
      if (!item || !integer(item.index, 0, game.words.length - 1) || unique.has(item.index) || !Array.isArray(item.cells) || !game.matches(item.cells, game.words[item.index].word)) throw Error('Invalid found word');
      unique.add(item.index);
    }
    game.found = clone(v.found); game.hints = v.hints; return game;
  }
  serialize() { return {seed: this.seed, theme: this.theme, level: this.level, found: clone(this.found), hints: this.hints}; }
  get done() { return this.found.length === this.words.length; }
  matches(cells, word) {
    if (!cells.length || cells.length !== word.length || !cells.every(p => Array.isArray(p) && p.length === 2 && p.every(x => integer(x, 0, this.size - 1)))) return false;
    if (JSON.stringify(pathBetween(cells[0], cells.at(-1), this.size)) !== JSON.stringify(cells)) return false;
    const text = cells.map(([r, c]) => this.grid[r][c]).join('');
    return text === word || [...text].reverse().join('') === word;
  }
  select(start, end) {
    if (this.done) return null;
    const cells = pathBetween(start, end, this.size);
    const index = this.words.findIndex((w, i) => !this.found.some(f => f.index === i) && this.matches(cells, w.word));
    if (index < 0) return null;
    this.found.push({index, cells}); return this.words[index];
  }
  hint() {
    if (this.done) return null;
    const next = this.words.find((_, i) => !this.found.some(f => f.index === i)); this.hints++;
    return {label: next.label, cell: [...next.cells[0]]};
  }
}
