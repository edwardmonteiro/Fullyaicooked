# Fully AI Cooked

A free HTML5 arcade marketplace and an installable Android app.

The original repository contained only this README and its Apache 2.0 license. This implementation includes six original games: **Neon Rally**, **Orbit Breaker**, **Stack Circuit**, **Triathlon Sprint**, **Bike Rider**, and **Pocket Golf**. Cover illustrations are promotional art; gameplay uses canvas rendering, original vehicle and athlete sprites, and illustrated environments.

## Included

- Responsive dark marketplace with category filters, search, favorites, and recently played games.
- Fullscreen game player, touch and keyboard controls, saved campaign medals, local high scores, pause/resume, and optional synthesized music and effects.
- Automatic discovery of repository game bundles and standalone HTML games.
- Native Android WebView shell with bundled offline games, safe system-bar insets, native Back behavior, and no JavaScript-to-Java object bridge.
- AdMob test banner and capped interstitial integration, plus UMP consent for live mode.
- Optional consent-gated AdSense catalog banner. Disabled until publisher configuration is supplied.
- GitHub Actions for APK and website builds, plus a manually triggered GitHub Pages deployment workflow.

## Run and build

Node.js 20.19+ or 22.12+. The production website has no runtime npm dependencies. Install development dependencies with `npm ci` to use the optional Vite preview (`npm run dev`, after building).

```sh
npm run check
npm run build
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Use a web server instead of opening `index.html` directly, because game modules use browser origin rules.

Android requires Java 17, Android SDK platform 36 / build-tools 36.0.0, and Gradle 8.13:

```sh
npm run android:sync
cd android
gradle assembleDebug
```

The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. The included GitHub Actions workflow installs the toolchain and uploads the APK automatically.

To include a download in the website, copy the finished APK to `releases/fully-ai-cooked.apk`, then run `npm run build`. APK files are excluded from Git; distribution artifacts are published separately.

The preview requires Android 6.0+ and a current compatible Android System WebView. It does not request microphone, camera, location, contacts, or file-storage permission. Internet access is used for advertising when available; the included games work offline.

## Championship update — v1.2.0

The six games now share a campaign menu, progression, medal awards, countdowns, pause/resume, and a control deck outside the playfield. Win an event to unlock the next one. Progress is stored on the current browser/device and does not sync between installations.

| Game | Campaign | Gameplay |
| --- | --- | --- |
| Neon Rally | 4 circuits | Curved roads, braking, nitro, close calls, moving traffic, timed checkpoints |
| Orbit Breaker | 5 sectors | Armored targets, explosive blocks, paddle aiming, wide paddle, multiball, shields |
| Stack Circuit | 4 towers | Falling blocks, width trimming, crosswind, limited Focus, perfect-drop restoration |
| Triathlon Sprint | 3 championships | Four rivals, swimming currents, stamina, drafting, three disciplines, top-three qualification |
| Bike Rider | 3 trails | Buffered jumps, air rotation, slope-sensitive landings, marked gaps, checkpoint respawns |
| Pocket Golf | 3 cups / 9 holes | Physics-based aiming guide, bank shots, sand, water, moving gates, circular bumpers |

All six support touch and keyboard input and work offline in the APK. Touch controls support independent steering and action pointers. Golf caps each hole at eight strokes; picking up an unfinished hole prevents cup qualification. The moving-gate trajectory is a short prediction at the current aim and release time.

`games/shared/runtime.js` runs the games, `championship.js` contains campaign models, `championship-render.js` and `sports/render.js` draw them, and `progress.js` validates local saves. The earlier engines remain as compatibility/reference code; all six entries use the new runtime.

`npm run check` verifies syntax and runs the gameplay tests, including complete unmodified physics routes through the campaigns, input effects, collision rules, and saved progress. See [Gameplay verification](docs/GAMEPLAY_QA.md) for verification scope and limitations. Each completed event sends one message to the existing capped advertising flow.

## Add games and earn revenue

See [Adding games](docs/ADDING_GAMES.md) and [Advertising activation](docs/MONETIZATION.md).

**Test ads do not earn revenue.** Production revenue requires your own approved AdMob/AdSense accounts, publisher IDs, consent configuration, and release signing. The delivered preview is not a Play Store submission.

## Publication

The active hosted arcade uses the `.openai/hosting.json` project identity. `npm run build` emits the publishable `dist/` folder. A GitHub Pages alternative is also included: configure the repository's Pages source as GitHub Actions, then run **Publish free arcade to GitHub Pages**. Existing deployed Sites are updated through the Sites publication flow; GitHub pushes alone do not update that deployment.

The APK is an offline snapshot of the catalog at build time. New games require a website rebuild/publication and a new APK build to include them offline.
