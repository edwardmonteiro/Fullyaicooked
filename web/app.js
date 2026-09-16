(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const games = window.ARCADE_CATALOG?.games || [];
  const native = /FullyAICooked\/1/.test(navigator.userAgent);
  if (native) document.body.classList.add('native');
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const storedFavorites = read('cooked:favorites', []);
  let favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);
  let recent = read('cooked:recent', []); if (!Array.isArray(recent)) recent = [];
  let category = 'All games', view = 'discover', currentGame = null, toastTimer;
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 14 8-14 8z"/></svg>';
  const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const text = (tag, className, value) => { const el = document.createElement(tag); el.className = className; el.textContent = value; return el; };
  const nativeEvent = (name, data = '') => { if (native) location.href = `arcade://${name}?value=${encodeURIComponent(data)}`; };
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 2200); }
  function renderFilters() {
    $('filters').replaceChildren();
    for (const label of ['All games', ...new Set(games.map(g => g.category))]) {
      const button = text('button', 'filter', label); button.setAttribute('aria-pressed', String(category === label));
      button.onclick = () => { category = label; renderFilters(); render(); }; $('filters').append(button);
    }
  }
  function imageFor(game) { const img = document.createElement('img'); img.src = game.cover; img.alt = `${game.title} cover art`; img.width = 960; img.height = 600; img.loading = 'lazy'; img.onerror = () => img.replaceWith(text('div', 'cover-fallback', game.title[0])); return img; }
  function render() {
    $('games').replaceChildren();
    const query = $('search').value.trim().toLowerCase();
    const visible = games.filter(g => (view !== 'favorites' || favorites.has(g.id)) && (category === 'All games' || g.category === category) && `${g.title} ${g.description} ${g.category}`.toLowerCase().includes(query));
    $('collection-title').textContent = view === 'favorites' ? 'Your favorites' : 'Fresh from the kitchen';
    $('result-count').textContent = `${visible.length} ${visible.length === 1 ? 'game' : 'games'} · All free`;
    $('favorite-count').textContent = games.filter(g => favorites.has(g.id)).length;
    $('empty').hidden = visible.length > 0;
    $('empty-message').textContent = !games.length ? 'New games will appear here when the next collection is published.' : view === 'favorites' && !favorites.size ? 'Tap the heart on a game to keep it here.' : 'Try another title or category.';
    for (const game of visible) {
      const card = text('article', 'game-card', '');
      const cover = text('button', 'cover-button', ''); cover.setAttribute('aria-label', `Play ${game.title}`); cover.onclick = () => launch(game.id);
      cover.append(game.cover ? imageFor(game) : text('div', 'cover-fallback', game.title[0])); const overlay = text('span', 'cover-play', ''); overlay.innerHTML = playIcon; cover.append(overlay);
      const meta = text('div', 'card-meta', ''); const label = text('span', 'category', game.category); label.style.color = game.color;
      const favorite = text('button', 'favorite', ''); favorite.innerHTML = heart; favorite.setAttribute('aria-label', `${favorites.has(game.id) ? 'Remove' : 'Save'} ${game.title} ${favorites.has(game.id) ? 'from' : 'to'} favorites`); favorite.setAttribute('aria-pressed', String(favorites.has(game.id)));
      favorite.onclick = () => { const added = !favorites.has(game.id); added ? favorites.add(game.id) : favorites.delete(game.id); save('cooked:favorites', [...favorites]); render(); toast(added ? 'Saved to favorites' : 'Removed from favorites'); };
      meta.append(label, favorite);
      const bottom = text('div', 'card-bottom', ''); const button = text('button', 'primary', 'Play now '); button.insertAdjacentHTML('beforeend', playIcon); button.setAttribute('aria-label', `Play ${game.title}`); button.onclick = () => launch(game.id); bottom.append(button, text('span', 'free', 'Free to play'));
      card.append(cover, meta, text('h3', '', game.title), text('p', '', game.description), bottom); $('games').append(card);
    }
    renderRecent();
  }
  function renderRecent() {
    const played = recent.map(id => games.find(g => g.id === id)).filter(Boolean).slice(0, 4);
    $('recent').hidden = !played.length || view === 'favorites'; $('recent-games').replaceChildren();
    for (const game of played) { const button = text('button', 'recent-game', ''); if (game.cover) button.append(imageFor(game)); button.append(text('span', '', game.title)); button.onclick = () => launch(game.id); $('recent-games').append(button); }
  }
  function setView(value) { view = value; for (const id of ['discover', 'favorites']) { $(id).classList.toggle('active', id === view); id === view ? $(id).setAttribute('aria-current', 'page') : $(id).removeAttribute('aria-current'); } category = 'All games'; $('search').value = ''; close(); renderFilters(); render(); }
  function mountFrame(game) {
    $('game-stage').querySelector('iframe')?.remove(); $('game-loading').hidden = false;
    const frame = document.createElement('iframe'); frame.title = game.title; frame.src = game.entry; frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock'); frame.allow = 'autoplay; fullscreen; gamepad'; frame.allowFullscreen = true;
    frame.onload = () => { $('game-loading').hidden = true; frame.focus(); }; $('game-stage').append(frame);
  }
  function launch(id, updateHash = true) {
    const game = games.find(g => g.id === id); if (!game) return false;
    if (currentGame) nativeEvent('leave', currentGame.id);
    currentGame = game; document.body.classList.add('playing'); $('player').hidden = false;
    $('playing-title').textContent = game.title; $('playing-category').textContent = game.category; $('controls').textContent = game.controls;
    document.title = `${game.title} — Fully AI Cooked`; mountFrame(game);
    recent = [id, ...recent.filter(x => x !== id)].slice(0, 8); save('cooked:recent', recent);
    if (updateHash) history.pushState({ game: id }, '', `#play/${encodeURIComponent(id)}`);
    window.scrollTo(0, 0); nativeEvent('play', `${game.id}|${game.audience}`); return true;
  }
  function close(updateHash = true) {
    if (currentGame) { nativeEvent('leave', currentGame.id); $('game-stage').querySelector('iframe')?.remove(); }
    currentGame = null; document.body.classList.remove('playing'); $('player').hidden = true; document.title = 'Fully AI Cooked — Free Arcade';
    if (updateHash) history.replaceState(null, '', location.pathname + location.search);
    if (document.fullscreenElement) document.exitFullscreen?.(); renderRecent();
  }
  $('discover').onclick = () => setView('discover'); $('favorites').onclick = () => setView('favorites');
  $('search').oninput = render; $('reset').onclick = () => setView('discover');
  $('close-game').onclick = () => { close(); $('discover').focus(); }; $('reload-game').onclick = () => { if (currentGame) mountFrame(currentGame); };
  $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('player').requestFullscreen(); } catch { toast('Fullscreen is unavailable in this browser.'); } };
  $('privacy-options').onclick = () => native ? nativeEvent('privacy') : window.CookedAds?.privacy();
  window.setAdPrivacyAvailable = value => { $('privacy-options').hidden = !value; };
  window.arcadeBack = () => { if (currentGame) { close(); return true; } return false; };
  window.arcadePause = () => $('game-stage').querySelector('iframe')?.contentWindow.postMessage({ type: 'cooked:pause' }, location.origin);
  function route() { let id; try { id = decodeURIComponent(location.hash.replace(/^#play\//, '')); } catch { close(false); return; } if (location.hash.startsWith('#play/')) { if (!launch(id, false)) { close(); toast('That game is not in this collection.'); } } else close(false); }
  window.addEventListener('popstate', route);
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.arcadePause(); });
  window.addEventListener('message', e => { if (e.origin === location.origin && e.source === $('game-stage').querySelector('iframe')?.contentWindow && e.data?.type === 'cooked:round-complete') nativeEvent('round', currentGame?.id || ''); });
  renderFilters(); render(); route(); nativeEvent('ready');
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const register = tool => { try { Promise.resolve(document.modelContext.registerTool(tool, {signal:lifecycle.signal})).catch(() => {}); } catch {} };
    register({name:'list_arcade_games',description:'List available games in this arcade.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({games:games.map(({id,title,category})=>({id,title,category}))})});
    register({name:'open_arcade_game',description:'Open a game’s start screen. This updates the visible player and recent games.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.id!=='string'||!games.some(g=>g.id===input.id))throw new Error('Unknown game');launch(input.id);return {opened:input.id};}});
    window.addEventListener('pagehide', () => lifecycle.abort(), {once:true});
  }
})();
