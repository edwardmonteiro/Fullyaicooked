import {Solitaire, SUITS, SUIT_NAMES, face, suit, red, cardName} from './solitaire.js';
import {Domino, TILES, tileName, points, chooseDomino} from './domino.js';
import {WordSearch, THEMES, pathBetween} from './words.js';
import {freshSeed, readSave, writeSave} from './common.js';

const kind = document.body.dataset.game;
const TYPES = {'paciencia': Solitaire, 'domino': Domino, 'caca-palavras': WordSearch};
const TITLES = {'paciencia': 'Paciência', 'domino': 'Dominó', 'caca-palavras': 'Caça-palavras'};
const HELP = {
  paciencia: ['Organize as colunas do rei ao ás, alternando cartas vermelhas e pretas.', 'Toque em uma carta e depois no destino destacado. Só reis ocupam colunas vazias.', 'Leve cada naipe ao topo, do ás ao rei. O monte vira uma carta por vez; você pode voltar a ele quantas vezes quiser.'],
  domino: ['Combine números iguais em uma das pontas. Toque em uma peça destacada para jogar.', 'Se a peça servir nas duas pontas, escolha Esquerda ou Direita. Sem jogada, compre até poder jogar.', 'Quem termina as peças vence. Se a mesa fechar, vence quem tiver menos pontos. A maior dupla começa.'],
  'caca-palavras': ['Encontre na grade todas as palavras da lista. Os acentos aparecem na lista, mas não na grade.', 'Toque na primeira letra e depois na última, ou deslize entre elas. Use as setas e Enter no teclado.', 'No nível Tranquilo, procure da esquerda para a direita e de cima para baixo. Não há limite de tempo.']
};
const ICONS = {
  undo: '<path d="M9 5 4 10l5 5M4 10h9a7 7 0 0 1 0 14" transform="translate(0 -2)"/>',
  hint: '<path d="M8 15c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7M8 16h8M9 20h6M10 23h4" transform="translate(0 -1)"/>',
  auto: '<path d="m4 5 8 7-8 7zm9 0 8 7-8 7z"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  reset: '<path d="M20 8a8 8 0 1 0 0 8M20 3v6h-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const $ = id => document.getElementById(id);
const node = (tag, cls = '', text = '') => { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; };
const button = (text, cls, fn) => { const e = node('button', cls, text); e.type = 'button'; e.onclick = fn; return e; };
const setData = (el, key) => { el.dataset.key = key; return el; };
let storage;
try { storage = window.localStorage; } catch { storage = {getItem: () => null, setItem: () => { throw Error('Storage unavailable'); }}; }
const saved = readSave(storage, kind, value => TYPES[kind].restore(value));
let model = saved?.model || new TYPES[kind](freshSeed());
let recorded = saved?.recorded || false, firstStart = !saved, selected = null, hint = null, computerTimer = null, startCell = null, dragEnd = null, dragging = false, suppressClick = false;
let large = false; try { large = storage.getItem('cooked:classics:text') === 'large'; } catch {}
document.body.classList.toggle('large', large);

document.body.innerHTML = `<div class="game"><header class="topbar"><h1>${TITLES[kind]}</h1><button type="button" class="menu-button" id="menu">Menu</button></header><div class="status"><span id="status-main"></span><span id="status-detail"></span></div><main class="play-area" id="board" aria-label="Mesa de jogo"></main><p class="message" id="message" role="status" aria-live="polite"></p><div class="save-warning" id="save-warning" hidden>O salvamento está indisponível. Mantenha esta janela aberta para continuar a partida.</div><footer class="toolbar" id="toolbar"></footer></div><dialog id="menu-dialog" aria-labelledby="dialog-title"><h2 id="dialog-title">${TITLES[kind]}</h2><div id="dialog-content"></div></dialog>`;

function say(message) { $('message').textContent = message; }
function persist() { const ok = writeSave(storage, kind, model, recorded); $('save-warning').hidden = ok; }
function focusKey(key) { if (key) [...document.querySelectorAll('[data-key]')].find(e => e.dataset.key === key)?.focus({preventScroll: true}); }
function tool(text, name, fn, disabled = false) { const e = button('', 'tool', fn); e.innerHTML = `${icon(name)}<span>${text}</span>`; e.disabled = disabled; e.setAttribute('aria-label', text); return e; }
function changed(message) {
  selected = null; hint = null; startCell = null;
  persist(); render();
  if (message) say(kind === 'domino' && !model.done && model.turn === 0 && !model.legal().length ? `${message} Sem encaixe: toque em ${model.stock.length ? 'Comprar' : 'Passar'}.` : message);
  if (model.done) finish(); else scheduleComputer();
}
function render() {
  const focused = document.activeElement?.dataset.key;
  const oldScroll = $('board').querySelector('.scroll-board,.word-scroll')?.scrollLeft || 0;
  $('board').replaceChildren(); $('toolbar').replaceChildren();
  if (kind === 'paciencia') renderSolitaire(); else if (kind === 'domino') renderDomino(); else renderWords();
  const scroller = $('board').querySelector('.scroll-board,.word-scroll'); if (scroller) scroller.scrollLeft = oldScroll;
  focusKey(focused);
}
function sourceKey(source) { return `${source.zone}:${source.col ?? ''}:${source.index ?? ''}`; }
function sameSource(a, b) { return !!a && !!b && sourceKey(a) === sourceKey(b); }
function card(id, source) {
  const e = button('', `card${red(id) ? ' red' : ''}`, () => selectCard(source));
  e.innerHTML = `<span class="rank-suit"><span>${face(id)}</span><span>${SUITS[suit(id)]}</span></span><span class="center-suit" aria-hidden="true">${SUITS[suit(id)]}</span>`;
  e.setAttribute('aria-label', `${cardName(id)}${source.zone === 't' ? `, coluna ${source.col + 1}` : source.zone === 'w' ? ', descarte' : ', fundação'}`);
  setData(e, sourceKey(source)); e.classList.toggle('selected', sameSource(selected, source)); e.setAttribute('aria-pressed', String(sameSource(selected, source)));
  if (hint && sameSource(hint.source, source)) e.classList.add('hint');
  if (selected && source.zone !== 'w' && model.canMove(selected, {zone: source.zone, col: source.col})) e.classList.add('target');
  return e;
}
function selectCard(source) {
  if ($('menu-dialog').open || model.done) return;
  if (selected && source.zone !== 'w' && model.move(selected, {zone: source.zone, col: source.col})) { changed('Carta movida.'); return; }
  selected = sameSource(selected, source) ? null : source; hint = null;
  render();
  if (!selected) say('Seleção cancelada.');
  else {
    const id = model.cards(selected)[0];
    say(`${cardName(id)} selecionado. Toque em um destino destacado.`);
  }
}
function moveTo(target) {
  if (selected && model.move(selected, target)) changed('Carta movida.');
  else say(target.zone === 't' ? 'Só um rei pode ocupar uma coluna vazia.' : 'Comece com o ás e siga o mesmo naipe, em ordem crescente.');
}
function renderSolitaire() {
  $('board').className = 'play-area'; const s = model.state;
  $('status-main').textContent = `Movimentos ${s.moves}`; $('status-detail').textContent = `${s.foundations.reduce((a, b) => a + b, 0)} de 52`;
  const scroll = node('div', 'scroll-board'), table = node('div', 'solitaire-board'), top = node('div', 'top-piles');
  const stock = setData(button('', `pile-slot stock${!s.stock.length ? ' empty' : ''}`, () => { if (model.draw()) changed(s.waste.length ? `${cardName(s.waste.at(-1))} no descarte.` : 'Monte refeito. Toque para virar uma carta.'); }), 'stock');
  stock.innerHTML = `${!s.stock.length ? icon('reset') : ''}<small aria-hidden="true">${s.stock.length || '↻'}</small>`;
  stock.setAttribute('aria-label', s.stock.length ? `Virar carta do monte, ${s.stock.length} restantes` : 'Recomeçar o monte'); stock.disabled = model.done || (!s.stock.length && !s.waste.length);
  if (hint?.draw) stock.classList.add('hint'); top.append(stock);
  const waste = node('div', 'pile-slot'); waste.setAttribute('aria-label', 'Descarte vazio'); if (s.waste.length) waste.append(card(s.waste.at(-1), {zone: 'w'})); top.append(waste, node('div', 'top-gap'));
  s.foundations.forEach((n, col) => {
    if (n) { const wrap = node('div', 'pile-slot'); wrap.append(card(col * 13 + n - 1, {zone: 'f', col})); top.append(wrap); }
    else { const e = setData(button('', 'pile-slot foundation', () => moveTo({zone: 'f', col})), `f:${col}:`); e.innerHTML = `<span>A</span><span class="suit-placeholder">${SUITS[col]}</span>`; e.setAttribute('aria-label', `Fundação de ${SUIT_NAMES[col]}, começar com ás`); if (selected && model.canMove(selected, {zone: 'f', col})) e.classList.add('target'); top.append(e); }
  });
  const columns = node('div', 'columns');
  s.tableau.forEach((pile, col) => {
    const column = node('div', 'column'); let y = 0;
    const empty = setData(button('', 'pile-slot empty-column', () => moveTo({zone: 't', col})), `t:${col}:empty`); empty.setAttribute('aria-label', `Coluna ${col + 1} vazia, colocar rei`);
    if (selected && model.canMove(selected, {zone: 't', col})) empty.classList.add('target');
    if (!pile.length) column.append(empty);
    pile.forEach((c, index) => {
      const e = c.up ? card(c.id, {zone: 't', col, index}) : node('div', 'card back');
      if (!c.up) e.setAttribute('aria-label', 'Carta virada para baixo');
      e.style.top = `${y}px`; e.style.zIndex = index + 1; column.append(e);
      y += c.up ? (large ? 43 : 34) : (large ? 20 : 15);
    });
    column.style.height = `calc(var(--card-h) + ${Math.max(0, y - (pile.at(-1)?.up ? (large ? 43 : 34) : (large ? 20 : 15)))}px)`; columns.append(column);
  });
  table.append(top, columns); scroll.append(table); $('board').append(scroll);
  $('toolbar').append(tool('Desfazer', 'undo', () => { if (model.undo()) changed('Última jogada desfeita.'); }, !model.history.length || model.done), tool('Dica', 'hint', solitaireHint, model.done), tool('Automático', 'auto', () => { const count = model.auto(); if (count) changed(`${count} ${count === 1 ? 'carta levada' : 'cartas levadas'} às fundações.`); else say('Nenhuma carta segura para subir agora. Continue nas colunas ou vire o monte.'); }, model.done));
}
function solitaireHint() {
  selected = null;
  hint = model.options().find(o => o.score > 0) || null;
  if (hint) { const id = model.cards(hint.source)[0]; selected = hint.source; render(); say(`Mova ${cardName(id)} para ${hint.target.zone === 'f' ? 'a fundação do mesmo naipe' : `a coluna ${hint.target.col + 1}`}.`); }
  else if (model.state.stock.length || model.state.waste.length) { hint = {draw: true}; render(); say(model.state.stock.length ? 'Toque no monte para virar outra carta.' : 'Toque no monte vazio para rever o descarte. Se nada mudar, use Desfazer ou inicie outra partida.'); }
  else { render(); say('Sem jogadas úteis agora. Você pode desfazer jogadas ou começar outra partida pelo Menu.'); }
}
const PIPS = {0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};
function tileFace(a, b, horizontal = false) {
  const tile = node('span', `tile${horizontal ? ' horizontal' : ''}`);
  for (const n of [a, b]) { const half = node('span', 'half'); for (let i = 0; i < 9; i++) half.append(node('span', `pip${PIPS[n].includes(i) ? '' : ' hidden'}`)); tile.append(half); }
  tile.setAttribute('aria-hidden', 'true'); return tile;
}
function playTile(id) {
  if (model.turn !== 0 || model.done || $('menu-dialog').open) return;
  const moves = model.legal().filter(m => m.id === id);
  if (!moves.length) { say('Esta peça não combina com as pontas. Escolha uma peça destacada.'); return; }
  if (moves.length === 1 || (model.chain.length && model.chain[0].a === model.chain.at(-1).b)) { model.play(id, moves[0].side); changed(model.last); }
  else { selected = selected === id ? null : id; render(); say(selected === null ? 'Seleção cancelada.' : `${tileName(id)} selecionado. Escolha Esquerda ou Direita.`); }
}
function renderDomino() {
  $('board').className = 'play-area domino-area';
  $('status-main').textContent = `Computador · ${model.hands[1].length} ${model.hands[1].length === 1 ? 'peça' : 'peças'}`; $('status-detail').textContent = `Monte ${model.stock.length}`;
  const surface = node('div', 'chain-surface');
  if (!model.chain.length) surface.append(node('p', 'chain-empty', `A maior dupla abre a mesa. ${model.turn === 0 ? 'Toque na peça destacada.' : 'O computador vai começar.'}`));
  else {
    const chain = node('div', 'chain'); chain.setAttribute('role', 'list'); chain.setAttribute('aria-label', 'Peças da mesa, em ordem');
    const width = $('board').clientWidth || 360, cols = Math.max(3, Math.min(7, Math.floor((width - 30) / (large ? 88 : width > 550 ? 80 : 68))));
    chain.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
    model.chain.forEach((t, i) => {
      const row = Math.floor(i / cols), reverse = row % 2 === 1, col = i % cols;
      const slot = node('div', `chain-piece${reverse ? ' reverse' : ''}${col === cols - 1 ? ' row-end' : ''}`); slot.style.gridRow = row + 1; slot.style.gridColumn = reverse ? cols - col : col + 1;
      slot.setAttribute('role', 'listitem'); slot.setAttribute('aria-label', `Peça ${i + 1}: ${t.a} e ${t.b}`); slot.append(tileFace(reverse ? t.b : t.a, reverse ? t.a : t.b, true)); chain.append(slot);
    }); surface.append(chain);
  }
  $('board').append(surface);
  const ends = node('div', 'ends');
  if (model.chain.length) for (const [side, label, value] of [['left', 'Esquerda', model.chain[0].a], ['right', 'Direita', model.chain.at(-1).b]]) {
    const e = button(`${label} · ${value}`, 'end', () => { if (model.play(selected, side, 0)) changed(model.last); });
    e.disabled = selected === null || model.turn !== 0 || !model.legal().some(m => m.id === selected && m.side === side); ends.append(e);
  }
  $('board').append(ends, node('p', 'turn-label', model.done ? 'Partida encerrada' : model.turn === 0 ? 'Sua vez' : 'Vez do computador'));
  const hand = node('div', 'hand'); hand.setAttribute('aria-label', 'Suas peças'); const playable = new Set(model.legal(0).map(m => m.id));
  model.hands[0].forEach(id => {
    const e = setData(button('', `tile${playable.has(id) && model.turn === 0 ? ' playable' : ''}${selected === id ? ' selected' : ''}`, () => playTile(id)), `tile-${id}`);
    const f = tileFace(...TILES[id]); e.append(...f.childNodes); e.setAttribute('aria-label', `${tileName(id)}${playable.has(id) && model.turn === 0 ? ', pode jogar' : ''}`); e.setAttribute('aria-pressed', String(selected === id)); e.disabled = model.turn !== 0 || model.done; hand.append(e);
  }); $('board').append(hand);
  if (selected !== null) [...hand.children].find(e => e.dataset.key === `tile-${selected}`)?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  const pass = !model.stock.length;
  $('toolbar').append(tool(pass ? 'Passar' : 'Comprar', 'plus', () => {
    if (pass) { if (model.pass(0)) changed(model.last); }
    else { const id = model.draw(0); if (id !== null) { changed(model.last); $('board').querySelector(`[data-key="tile-${id}"]`)?.scrollIntoView({block: 'nearest', inline: 'nearest'}); } }
  }, model.turn !== 0 || model.done || model.legal(0).length > 0), tool('Dica', 'hint', () => {
    const move = chooseDomino(model.view(0), 2);
    if (move) { selected = move.id; render(); say(`Jogue ${tileName(move.id)}${model.chain.length ? ` na ponta ${move.side === 'left' ? 'esquerda' : 'direita'}` : ' para abrir a mesa'}.`); }
    else say(model.stock.length ? 'Você precisa comprar uma peça.' : 'Sem peça possível. Toque em Passar.');
  }, model.turn !== 0 || model.done));
}
function scheduleComputer() {
  clearTimeout(computerTimer);
  if (kind !== 'domino' || model.turn !== 1 || model.done || $('menu-dialog').open || document.hidden) return;
  computerTimer = setTimeout(() => { if ($('menu-dialog').open || document.hidden) return; if (model.computerStep()) changed(model.last); }, 750);
}
function renderWords() {
  $('board').className = 'play-area word-area';
  $('status-main').textContent = model.theme; $('status-detail').textContent = `${model.found.length} de ${model.words.length} palavras`;
  const scroll = node('div', 'word-scroll'), grid = node('div', 'word-grid'); grid.style.setProperty('--size', model.size); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', `Grade de ${model.size} por ${model.size} letras`);
  const foundCells = new Set(model.found.flatMap(f => f.cells.map(p => p.join(','))));
  model.grid.forEach((row, r) => row.forEach((letter, c) => {
    const e = setData(button(letter, `letter${foundCells.has(`${r},${c}`) ? ' found' : ''}`, () => {
      if (suppressClick) { suppressClick = false; return; } wordTap([r, c]);
    }), `letter-${r}-${c}`);
    e.dataset.row = r; e.dataset.col = c; e.setAttribute('aria-label', `${letter}, linha ${r + 1}, coluna ${c + 1}`);
    e.tabIndex = r === 0 && c === 0 ? 0 : -1;
    if (hint?.cell[0] === r && hint.cell[1] === c) e.classList.add('word-hint');
    e.onkeydown = event => {
      const delta = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]}[event.key];
      if (delta) { event.preventDefault(); const nr = Math.max(0, Math.min(model.size - 1, r + delta[0])), nc = Math.max(0, Math.min(model.size - 1, c + delta[1])); e.tabIndex = -1; const next = grid.querySelector(`[data-row="${nr}"][data-col="${nc}"]`); next.tabIndex = 0; next.focus(); }
      if (event.key === 'Escape') { startCell = null; paintSelection([]); say('Seleção cancelada.'); }
    };
    grid.append(e);
  }));
  let down = null, captureCell = null;
  grid.onpointerdown = e => { const cell = e.target.closest('.letter'); if (!cell || model.done || $('menu-dialog').open || !e.isPrimary) return; down = [Number(cell.dataset.row), Number(cell.dataset.col)]; dragEnd = down; dragging = false; captureCell = cell; cell.setPointerCapture(e.pointerId); };
  grid.onpointermove = e => {
    if (!down || !captureCell?.hasPointerCapture(e.pointerId)) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.letter');
    if (!cell || !grid.contains(cell)) return;
    const end = [Number(cell.dataset.row), Number(cell.dataset.col)]; if (end[0] !== down[0] || end[1] !== down[1]) dragging = true;
    if (dragging) { dragEnd = end; paintSelection(pathBetween(down, end, model.size)); }
  };
  grid.onpointerup = e => { if (!down) return; if (captureCell?.hasPointerCapture(e.pointerId)) captureCell.releasePointerCapture(e.pointerId); if (dragging) { suppressClick = true; completeWord(down, dragEnd); setTimeout(() => { suppressClick = false; }, 0); } down = null; dragging = false; captureCell = null; };
  grid.onpointercancel = () => { down = null; dragging = false; startCell = null; paintSelection([]); };
  scroll.append(grid); const list = node('ul', 'word-list');
  model.words.forEach((w, i) => { const item = node('li', `${model.found.some(f => f.index === i) ? 'found' : ''}${hint?.label === w.label ? ' word-hint' : ''}`, w.label); if (model.found.some(f => f.index === i)) item.setAttribute('aria-label', `${w.label}, encontrada`); list.append(item); });
  $('board').append(scroll);
  if (large || model.level > 0) {
    const pan = node('div', 'ends'); pan.setAttribute('aria-label', 'Navegar pela grade');
    pan.append(button('Ver esquerda', 'end', () => { scroll.scrollLeft = Math.max(0, scroll.scrollLeft - 150); }), button('Ver direita', 'end', () => { scroll.scrollLeft += 150; })); $('board').append(pan);
  }
  $('board').append(list);
  if (startCell) paintSelection([startCell]);
  $('toolbar').append(tool('Dica', 'hint', () => { hint = model.hint(); startCell = null; persist(); render(); if (hint) say(`A palavra ${hint.label} começa na letra destacada. Toque nela e depois na última letra.`); }, model.done), tool('Novo jogo', 'reset', () => openMenu(true)));
}
function paintSelection(cells) { const keys = new Set(cells.map(p => p.join(','))); $('board').querySelectorAll('.letter').forEach(e => e.classList.toggle('selecting', keys.has(`${e.dataset.row},${e.dataset.col}`))); }
function wordTap(cell) {
  if (model.done || $('menu-dialog').open) return;
  if (!startCell) { startCell = cell; paintSelection([cell]); say('Agora toque na última letra da palavra.'); }
  else if (startCell[0] === cell[0] && startCell[1] === cell[1]) { startCell = null; paintSelection([]); say('Seleção cancelada.'); }
  else completeWord(startCell, cell);
}
function completeWord(start, end) {
  const word = model.select(start, end); startCell = null;
  if (word) changed(`${word.label} encontrada!`);
  else { paintSelection([]); say('Essa seleção não está na lista. Toque na primeira e na última letra, em linha reta.'); }
}

function openMenu(newRequested = false) {
  clearTimeout(computerTimer); persist(); selected = null; startCell = null;
  const dialog = $('menu-dialog'); $('dialog-title').textContent = firstStart ? TITLES[kind] : 'Partida pausada';
  const content = $('dialog-content'); content.replaceChildren();
  const instructions = node('ol'); HELP[kind].forEach(text => instructions.append(node('li', '', text))); content.append(instructions);
  if (kind === 'paciencia') content.append(node('p', 'small-note', 'As cartas são embaralhadas. Nem toda partida tem solução; você pode começar outra pelo Menu.'));
  const form = node('form'); form.onsubmit = e => e.preventDefault();
  if (kind === 'domino') addSelect(form, 'Dificuldade da próxima partida', 'level', ['Tranquilo', 'Equilibrado', 'Estratégico'], model.level);
  if (kind === 'caca-palavras') { addSelect(form, 'Tema da próxima partida', 'theme', Object.keys(THEMES), Object.keys(THEMES).indexOf(model.theme)); addSelect(form, 'Nível da próxima partida', 'level', ['Tranquilo · 8 × 8', 'Intermediário · 10 × 10', 'Desafio · 12 × 12'], model.level); content.append(node('p', 'small-note', 'Intermediário inclui diagonais. Desafio também inclui palavras de trás para frente.'));
  }
  const toggle = node('div', 'toggle'), label = node('label', '', 'Letras e peças maiores'); label.htmlFor = 'large-text'; const input = node('input'); input.type = 'checkbox'; input.id = 'large-text'; input.checked = large; input.onchange = () => { large = input.checked; document.body.classList.toggle('large', large); try { storage.setItem('cooked:classics:text', large ? 'large' : 'normal'); } catch {} render(); }; toggle.append(label, input); form.append(toggle); content.append(form);
  content.append(node('p', 'small-note', 'A partida fica salva neste aparelho. Você pode parar e continuar depois. Com letras maiores, deslize a mesa para os lados.'));
  const actions = node('div', 'dialog-actions');
  if (!model.done || firstStart) actions.append(button(firstStart ? 'Começar' : 'Continuar', 'primary', () => { if (firstStart) newGame(); else { dialog.close(); render(); say(defaultMessage()); scheduleComputer(); } }));
  if (!firstStart) actions.append(button(model.done ? 'Jogar de novo' : 'Nova partida', model.done || newRequested ? 'primary' : '', () => {
    if (model.done) newGame(); else confirmNew();
  }));
  content.append(actions); if (!dialog.open) dialog.showModal();
}
function addSelect(form, labelText, id, items, value) { const field = node('div', 'field'); const label = node('label', '', labelText); label.htmlFor = id; const select = node('select'); select.id = id; items.forEach((text, i) => { const option = node('option', '', text); option.value = i; option.selected = i === value; select.append(option); }); field.append(label, select); form.append(field); }
function readChoices() { return {level: Number($('level')?.value ?? model.level ?? 0), theme: Object.keys(THEMES)[Number($('theme')?.value ?? 0)]}; }
function confirmNew() {
  const choices = readChoices(); $('dialog-title').textContent = 'Começar outra partida?'; const content = $('dialog-content'); content.replaceChildren(node('p', '', 'A partida atual será substituída.'));
  const actions = node('div', 'dialog-actions'); actions.append(button('Sim, nova partida', 'primary', () => newGame(choices)), button('Voltar à partida', '', () => { $('menu-dialog').close(); render(); scheduleComputer(); })); content.append(actions);
}
function newGame(choices = readChoices()) {
  model = kind === 'domino' ? new Domino(freshSeed(), choices.level) : kind === 'caca-palavras' ? new WordSearch(freshSeed(), choices.theme, choices.level) : new Solitaire(freshSeed());
  firstStart = false; recorded = false; $('menu-dialog').close(); changed(defaultMessage());
}
function defaultMessage() { return kind === 'paciencia' ? 'Toque em uma carta e depois no destino. Vire o monte quando precisar.' : kind === 'domino' ? (model.turn === 0 ? 'Toque em uma peça destacada para jogar.' : 'O computador está escolhendo uma peça.') : 'Toque na primeira e na última letra, ou deslize entre elas.'; }
function finish() {
  clearTimeout(computerTimer);
  if (!recorded) { recorded = true; persist(); if (window.parent !== window) window.parent.postMessage({type: 'cooked:round-complete', game: kind}, window.location.origin); }
  const dialog = $('menu-dialog'); const content = $('dialog-content'); content.replaceChildren();
  let title, detail;
  if (kind === 'paciencia') { title = 'Paciência completa!'; detail = `As 52 cartas estão nas fundações. Você terminou em ${model.state.moves} movimentos.`; }
  else if (kind === 'caca-palavras') { title = 'Todas encontradas!'; detail = `${model.words.length} palavras de ${model.theme}. ${model.hints === 0 ? 'Você encontrou tudo sem dicas.' : `${model.hints} ${model.hints === 1 ? 'dica usada' : 'dicas usadas'}.`}`; }
  else { title = model.winner === 0 ? 'Você venceu!' : model.winner === -1 ? 'Empate!' : 'O computador venceu'; const totals = model.hands.map(h => h.reduce((sum, id) => sum + points(id), 0)); detail = model.reason === 'empty' ? `${model.winner === 0 ? 'Você jogou' : 'O computador jogou'} todas as peças.` : `Mesa fechada. Seus pontos: ${totals[0]}. Computador: ${totals[1]}. Vence quem tem menos pontos.`; }
  $('dialog-title').textContent = title; content.append(node('p', 'result-detail', detail));
  const actions = node('div', 'dialog-actions'); actions.append(button('Jogar de novo', 'primary', () => { firstStart = true; openMenu(true); }), button('Ver a mesa', '', () => dialog.close())); content.append(actions); if (!dialog.open) dialog.showModal();
}
$('menu').onclick = () => model.done ? finish() : openMenu();
$('menu-dialog').addEventListener('cancel', e => { if (firstStart) e.preventDefault(); else scheduleComputer(); });
$('menu-dialog').addEventListener('close', () => { if (!firstStart) scheduleComputer(); });
function pause() { clearTimeout(computerTimer); persist(); if (!$('menu-dialog').open && !model.done) openMenu(); }
window.addEventListener('message', e => { if (e.source === window.parent && e.origin === window.location.origin && e.data?.type === 'cooked:pause') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', persist);
let previousWidth = document.documentElement.clientWidth;
window.addEventListener('resize', () => { if (Math.abs(document.documentElement.clientWidth - previousWidth) > 20) { previousWidth = document.documentElement.clientWidth; render(); } });
render(); say(defaultMessage());
if (model.done) { recorded = true; persist(); finish(); } else openMenu();
