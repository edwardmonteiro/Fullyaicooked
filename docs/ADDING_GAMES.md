# Add games to the arcade

Create `games/your-game/index.html` and put that game's CSS, JavaScript, images, and audio beside it. The next build discovers it automatically. Keep assets local for offline Android play.

Optional `games/your-game/game.json`:

```json
{
  "id": "your-game",
  "title": "Your Game",
  "description": "One short sentence describing the game.",
  "category": "Puzzle",
  "entry": "index.html",
  "cover": "cover.webp",
  "controls": "Tap to play. Use Space on a keyboard.",
  "audience": "general",
  "orientation": "portrait",
  "color": "#d9ff59"
}
```

The scanner also discovers index.html bundles elsewhere in the repository and standalone HTML files. It excludes the website, Android code, build outputs, dependencies, scripts, docs, tests, and hidden folders. A bundle containing index.html produces one catalog entry; supporting HTML pages are not listed separately. Root-level single HTML files should be self-contained. Put multi-file games in their own folders.

Set `hidden: true` to exclude a bundle. IDs must be unique. Entries and covers must stay inside their own game folder. Only publish content you own or have permission to redistribute and monetize.

Run `npm run android:sync` to regenerate the website and Android assets. Run `npm run check` to check syntax, catalog discovery, and gameplay collision behavior. GitHub Actions builds a fresh APK on each push to main or the feature branch.

The delivered APK is an offline snapshot. New games appear in the website after a rebuild and publication; the APK needs a new build to bundle them. No GitHub token is embedded in the website or app.

## Integrating pause and natural ad breaks

The games run in sandboxed iframes. They can use localStorage for their own scores. Repository games are trusted publisher-controlled code; review third-party games before including them.

Listen for `{type: 'cooked:pause'}` from the parent to pause on app backgrounding. Verify `event.source === parent` and `event.origin === location.origin` before handling it.

After a complete game round, send:

```js
parent.postMessage({type: 'cooked:round-complete'}, location.origin);
```

The Android host counts completed rounds. It considers an interstitial only when returning to the catalog, after 3 completed rounds, a 45-second game session, 3 minutes since launch, and 3 minutes since the previous ad. Missing ads never block gameplay. The host does not show ads on app exit or over game controls.

Mark child-directed games `audience: "children"`. This version disables all native advertising if the bundle contains any non-general-audience game. A mixed-audience commercial app needs a reviewed audience strategy before relaxing that behavior.
