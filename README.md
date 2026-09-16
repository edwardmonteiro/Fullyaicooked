# Fully AI Cooked

A free HTML5 arcade marketplace and an installable Android app.

The original repository contained only this README and its Apache 2.0 license. This implementation includes six original games: **Neon Rally**, **Orbit Breaker**, **Stack Circuit**, **Triathlon Sprint**, **Bike Rider**, and **Pocket Golf**. Cover illustrations are promotional art; gameplay uses lightweight canvas rendering with original sports sprites.

## Included

- Responsive dark marketplace with category filters, search, favorites, and recently played games.
- Fullscreen game player, touch and keyboard controls, local high scores, pause/resume, and optional synthesized sound.
- Automatic discovery of repository game bundles and standalone HTML games.
- Native Android WebView shell with bundled offline games, safe system-bar insets, native Back behavior, and no JavaScript-to-Java object bridge.
- AdMob test banner and capped interstitial integration, plus UMP consent for live mode.
- Optional consent-gated AdSense catalog banner. Disabled until publisher configuration is supplied.
- GitHub Actions for APK and website builds, plus a manually triggered GitHub Pages deployment workflow.

## Run and build

Node.js 20+; no npm dependencies are required for the website.

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

## Sports collection — v1.1.0

- **Triathlon Sprint:** swim, cycle, and run three 400 m stages, managing stamina and avoiding markers.
- **Bike Rider:** a finite alpine bicycle trail with jumping, terrain-following landings, rocks, and 18 collectible rings.
- **Pocket Golf:** six hand-built courses, drag-to-putt or keyboard aiming, wall rebounds, sand, water penalties, and a scorecard. A hole is picked up after at least eight strokes if the ball has not reached the cup.

All three support touch and keyboard input, pause automatically when backgrounded, save high scores locally, and work offline in the APK. Each reports one round completion at the finish screen for the existing capped advertising flow.

## Add games and earn revenue

See [Adding games](docs/ADDING_GAMES.md) and [Advertising activation](docs/MONETIZATION.md).

**Test ads do not earn revenue.** Production revenue requires your own approved AdMob/AdSense accounts, publisher IDs, consent configuration, and release signing. The delivered preview is not a Play Store submission.

## Publication

The active hosted arcade uses the `.openai/hosting.json` project identity. `npm run build` emits the publishable `dist/` folder. A GitHub Pages alternative is also included: configure the repository's Pages source as GitHub Actions, then run **Publish free arcade to GitHub Pages**. Existing deployed Sites are updated through the Sites publication flow; GitHub pushes alone do not update that deployment.

The APK is an offline snapshot of the catalog at build time. New games require a website rebuild/publication and a new APK build to include them offline.
