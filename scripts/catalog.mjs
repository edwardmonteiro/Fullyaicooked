import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const excluded = new Set(['web', 'dist', 'android', 'scripts', 'tests', 'docs', 'node_modules', 'build', 'toolchain']);
const exists = async p => access(p).then(() => true, () => false);
const niceName = name => name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export async function discoverGames(root) {
  const found = [];
  async function visit(relative) {
    const directory = path.join(root, relative);
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name);
    let meta = {};
    if (files.includes('game.json')) meta = JSON.parse(await readFile(path.join(directory, 'game.json'), 'utf8'));
    if (meta.hidden === true) return;
    const index = meta.entry || (files.includes('index.html') ? 'index.html' : null);
    if (index && relative) {
      if (index.includes('..') || path.isAbsolute(index) || !/\.html?$/.test(index) || !(await exists(path.join(directory, index)))) throw Error(`Invalid game entry: ${relative}/${index}`);
      await add(relative, index, meta, true);
      return;
    }
    for (const file of files.filter(f => /\.html?$/.test(f))) await add(relative, file, {}, false);
    for (const entry of entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !excluded.has(e.name))) await visit(path.posix.join(relative, entry.name));
  }
  async function add(directory, file, meta, bundle) {
    const entry = path.posix.join(directory, file);
    const html = await readFile(path.join(root, entry), 'utf8');
    const id = String(meta.id || (bundle ? directory : entry.replace(/\.html?$/, ''))).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const title = meta.title || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || niceName(file);
    if (!id || found.some(g => g.id === id)) throw Error(`Duplicate or empty game ID: ${id}`);
    const coverFile = meta.cover || (await exists(path.join(root, directory, 'cover.webp')) ? 'cover.webp' : null);
    if (coverFile && (coverFile.includes('..') || path.isAbsolute(coverFile) || !(await exists(path.join(root, directory, coverFile))))) throw Error(`Missing or unsafe cover: ${entry}`);
    found.push({ id, title, description: meta.description || 'An independent HTML5 game. Jump in and play for free.', category: meta.category || 'Arcade', controls: meta.controls || 'Follow the controls shown inside the game.', orientation: meta.orientation || 'any', audience: meta.audience || 'general', color: /^#[0-9a-f]{6}$/i.test(meta.color || '') ? meta.color : '#d9ff59', entry: 'content/' + entry, cover: coverFile ? 'content/' + path.posix.join(directory, coverFile) : null, order: meta.order ?? 100, sourceDirectory: directory, sourceFile: file, bundle });
  }
  await visit('');
  return found.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
