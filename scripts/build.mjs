import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverGames } from './catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const games = await discoverGames(root);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'web'), out, { recursive: true });
for (const game of games) {
  const src = path.join(root, game.sourceDirectory, game.bundle ? '' : game.sourceFile);
  const dst = path.join(out, 'content', game.sourceDirectory, game.bundle ? '' : game.sourceFile);
  await mkdir(path.dirname(dst), { recursive: true });
  await cp(src, dst, { recursive: true, filter: p => !path.basename(p).startsWith('.') });
}
await cp(path.join(root, 'games/shared'), path.join(out, 'content/games/shared'), { recursive: true });
const publicGames = games.map(({ sourceDirectory, sourceFile, bundle, order, ...g }) => g);
const catalog = { version: 1, games: publicGames };
await writeFile(path.join(out, 'catalog.json'), JSON.stringify(catalog, null, 2));
await writeFile(path.join(out, 'catalog.js'), `window.ARCADE_CATALOG=${JSON.stringify(catalog).replace(/</g, '\\u003c')};\n`);
const monetization = JSON.parse(await readFile(path.join(root, 'monetization.json'), 'utf8'));
const webAds = monetization.web;
if (webAds.enabled && (!/^ca-pub-\d{16}$/.test(webAds.publisherId) || !/^\d+$/.test(webAds.bannerSlot) || !webAds.certifiedCmpConfigured)) throw Error('Live web ads require publisher ID, banner slot, and a configured Google-certified CMP.');
await writeFile(path.join(out, 'ad-config.js'), `window.ARCADE_ADS=${JSON.stringify(webAds)};\n`);
const publisherIds = new Set();
if (webAds.enabled) publisherIds.add(webAds.publisherId.replace('ca-', ''));
if (monetization.android.mode === 'live') publisherIds.add(monetization.android.applicationId.split('~')[0].replace('ca-app-', ''));
const sellers = [...publisherIds].map(id => `google.com, ${id}, DIRECT, f08c47fec0942fa0`).join('\n');
await writeFile(path.join(out, 'ads.txt'), sellers || '# Advertising is not activated.\n');
await writeFile(path.join(out, 'app-ads.txt'), sellers || '# Advertising is not activated.\n');
const apk = path.join(root, 'releases/fully-ai-cooked.apk');
const hasApk = await access(apk).then(() => true, () => false);
if (hasApk) { await mkdir(path.join(out, 'downloads'), {recursive:true}); await cp(apk, path.join(out, 'downloads/fully-ai-cooked.apk')); }
if (process.argv.includes('--android')) {
  const assets = path.join(root, 'android/app/src/main/assets/site');
  await rm(assets, { recursive: true, force: true });
  await cp(out, assets, { recursive: true });
  await rm(path.join(assets, 'downloads'), {recursive:true,force:true});
  // Native AdMob owns advertising in the APK; never load AdSense inside WebView.
  await writeFile(path.join(assets, 'ad-config.js'), 'window.ARCADE_ADS={enabled:false};\n');
}
console.log(`Built ${games.length} games: ${games.map(g => g.title).join(', ')}`);
