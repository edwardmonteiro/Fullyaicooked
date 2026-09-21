# Fully AI Cooked

A free HTML5 arcade marketplace and an installable Android app.

The original repository contained only this README and its Apache 2.0 license. The catalog now contains twenty-one games. The six original games are: **Neon Rally**, **Orbit Breaker**, **Stack Circuit**, **Triathlon Sprint**, **Bike Rider**, and **Pocket Golf**. They use illustrated environments and original sprites. Three additional HTML5 tributes revisit River Raid, Enduro and Pitfall with independently written code, bitmap artwork and level layouts.

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

## Nostalgia update — v1.7.0

Fishing Derby, Combat and Keystone Kapers add three independent HTML5 recreations. All have Portuguese instructions, large controls outside the 4:3 playfield, synthesized effects, pause on backgrounding and local records separated by mode. They work offline in the APK. No ROMs or extracted game assets are included.

| Game | Rules and progression |
| --- | --- |
| Fishing Derby | Six fish rows worth 2/4/6 lb, mouth contact, first-hook reel priority, lateral shark avoidance, first to 99 lb, computer fisherman; three difficulty settings and fastest-win record |
| Combat | 136-second aircraft duels against a computer pilot, one point per hit, clouds hide planes but permit hits, continuous flight and screen wrapping; biplanes, machine-gun biplanes and jets |
| Keystone Kapers | Three internal floors plus roof, scrolling corridors and live minimap, scheduled elevator doors, upward escalators, jump/duck, 9-second obstacle penalties, dangerous planes, 50-point loot, four initial police, bonus police each 10,000 points, escalating pursuits and time-based capture multipliers |

Fidelity boundary: researched game rules with original code and pixel geometry, not cartridge emulation. Combat is an aircraft subset, with a new solo opponent and unified turn/speed touch controls; tank and formation modes are not included. Collision geometry and game timings are authored. Keystone's corridor layouts, hazard schedules and elevator cycle are original. Fishing's trajectories, bite tolerances and opponent strategy are original. Controls remain simple; the simulation runs at 120 Hz.

References: [Fishing Derby manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=182), [Combat manual](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=94), [Keystone Kapers manual](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=261).

Validation: **87 tests pass**. New normal-input controllers win fishing races in all modes, finish winning 136-second duels in all aircraft modes, complete nine consecutive arrests through elevators, and complete an arrest using only escalators. Mechanical checks cover reel priority, shark theft, aircraft silhouettes and seams, cloud concealment, ducking, timing penalties, life accounting and frozen terminal states. Device/browser coverage is recorded in [nostalgia QA](docs/NOSTALGIA_QA.md).

## Clássicos de arcade — v1.6.0

Three independent HTML5 recreations add more complete historical game mechanics:

| Game | Play and progression |
| --- | --- |
| Space Invaders | 2600 single-player rule base: 36 enemies, one player shot, 3 destructible shields, 5–30 points by row, 200-point command ship, faster movement as the formation shrinks, 3 lives, descending waves; optional faster zigzag bombs |
| Breakout | Arcade rule base: 112 bricks in 8 rows, 5 balls, two walls / 896 points, contact-dependent rebound angle, speed steps, a half-width paddle after the ceiling, and swept collision detection |
| Asteroids | 4 ships, persistent momentum, rotation/thrust/fire, screen wrapping, 20/50/100-point size tree, bonus ship each 5,000 points, risky hyperspace; optional enemy saucers; projectiles and ship core use the rendered rock polygons |

Portuguese menus, large touch controls, keyboard/gamepad input, local high scores separated by mode, pause on backgrounding, synthesized sound and optional phosphor texture. Game simulation runs at 120 Hz. No account or purchase is required. Ads can only be requested after game over, never mid-wave.

Enduro now shares one perspective projection between rendering and traffic collision checks, uses long smooth bends, avoids repeated overlapping traffic lanes, varies opponent placement over successive days, blends weather palettes and provides a compact direction/brake/accelerator deck. Going off-road can no longer accelerate a stopped car. The existing 200/300 passing quotas, coasting and 120-second day are preserved.

These are recreations, not cartridge emulation or frame-exact ports. Breakout follows the arcade base rather than the 2600 variant. Asteroids combines 2600-style life/scoring rules with readable vector outlines; enemy patterns, wave counts, timings and a two-second hyperspace cooldown are authored. There are no ROMs or extracted sprites. The generated concept's erroneous Invaders count and rainbow wall were replaced with the researched formation and four-color scoring bands. Functional pixel/vector shapes remain code-native so artwork and collision geometry agree.

References: [Space Invaders instruction booklet](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=460), [Asteroids instruction booklet](https://www.atariage.com/manual_html_page.php?SoftwareID=828&SystemID=2600&itemTypeID=HTMLMANUAL), [Atari Breakout operator manual, TM-058](https://arcarc.xmission.com/PDF_Arcade_Atari_Kee/Breakout/Breakout_TM-058_1st_Edition.pdf), [Enduro instruction booklet](https://atariage.com/manual_html_page.php?SoftwareLabelID=163).

`npm run check` passes **71 tests**. New fixtures complete both Breakout walls at 896 points, four Invaders waves and at least three Asteroids fields using ordinary input controls. Existing Enduro fixtures still qualify for two successive days. Tests also exercise shield erosion, projectile limits, corner and seam collisions, score/life accounting, challenge modes and terminal-state freezing. Browser checks cover 390×780 phones, 740×780 desktop, and 780×390 Enduro. Real Android multi-touch/gamepad and device performance remain untested.

## Clássicos de mesa — v1.5.0

Three Portuguese single-player games add calm, readable play to the arcade. All work offline in the APK, remember unfinished rounds on the current device, and offer larger text/pieces, keyboard controls, in-game instructions and pause/resume.

| Game | Rules and controls |
| --- | --- |
| Paciência | Standard 52-card Klondike, draw one, unlimited redeals, alternating descending columns, same-suit ascending foundations, kings in empty columns, legal-move hints, up to 200 undo steps and safe automatic foundation moves. Tap a card and its highlighted destination. Random deals are not guaranteed solvable. |
| Dominó | Double-six draw dominoes against one computer player. Seven starting tiles each, highest dealt double opens, mandatory buying when blocked, pass only when the stock is empty, fewest pips wins a blocked round. Three AI difficulties use only their own hand and public information. |
| Caça-palavras | Six themes (Jardim, Cozinha, Animais, Viagem, Música, Casa), 8×8 / 10×10 / 12×12 grids, six / eight / ten words. Higher levels add diagonals and reversed words. Select by tapping endpoints, dragging, or arrows and Enter; hints reveal the starting letter. Every listed word is placed; there is no timer. |

The games use semantic HTML controls and exact native card ranks, suits, domino pips and letters, over an original generated felt texture. No external fonts or images are required. Saved state is validated before restoring and uses separate `cooked:classics:v1:` keys. Only a completed round sends an advertising event; opening menus, requesting hints and starting over do not trigger it.

The Android preview is **1.7.0-preview (code 8)**, includes all **21 games**, and keeps the existing v1.2–v1.6 preview signing certificate. Test advertising remains enabled and does not earn revenue.

## Mobile Arcade — v1.4.0

Three new portrait games combine simple single-player controls with illustrated mobile-game artwork. They add nine missions, saved stars and best scores, pause/resume, keyboard controls, touch gestures and short synthesized effects. No account or internet connection is needed to play in the APK.

| Game | Controls | Three-mission progression |
| --- | --- | --- |
| Starfall Patrol | Drag to fly; automatic fire; tap Pulse or press Space | Five formation patterns, shield/double-fire pickups, checkpoint resupply, three sentinel bosses with wider bullet fans |
| Sunset Rider | Swipe/tap a lane or use left/right; hold Turbo/Space | Three checkpoint routes, denser traffic, fair open lanes, energy pickups, close-call bonuses and checkpoint hull repair |
| Sky Bastion | Tap to intercept; arrows/WASD aim, Space fires; tap EMP | Five, six, then seven waves; splitting missiles, finite recharging energy, chain-reaction explosions and three cities to protect |

The games use a deterministic 120 Hz simulation in `games/shared/mobile/`, separate from the responsive canvas renderer. All visual assets are bundled; no external image or font services are required. The compact control deck stays outside the playfield. Progress uses the existing per-game campaign storage, leaving the earlier games' records intact.

The Android preview is version 1.4.0 (code 5) and retains the v1.2/v1.3 signing certificate. New games participate in the existing capped advertising flow only after a mission ends. **The preview still uses test ads and does not generate advertising revenue.**

## 2600 Tributes — v1.3.0

Three independent HTML5 recreations join the original six games. These preserve selected gameplay rules and the broad-pixel, 4:3 presentation of Atari 2600 games. They have new code, artwork, maps, timing and synthesized audio; they do not include ROMs or claim cartridge-level emulation fidelity.

| Tribute | Rules and progression |
| --- | --- |
| River Raid | Fuel depots, speed control, guided single missiles, ships/helicopters/jets, islands, destructible bridges, three jets, bridge respawns, extra jets at 10,000 points |
| Enduro | Pass 200 cars on day one and 300 on subsequent days; maintain speed when releasing gas; brake, steer through bends, endure ice, sunset, darkness and fog; survive until dawn |
| Pitfall | Twenty-minute expedition, three lives, 255 connected screens, 32 treasures, vines with jump-to-grab/release, crocodile jaws, opening sand, rolling logs, fire, snakes, ladders and tunnel shortcuts |

All three use the shared `games/shared/retro/` runtime with keyboard, touch and gamepad input, pause/resume, optional CRT scanlines, synthesized sound, local high scores and one advertising event only after game over. Directional and action buttons stay outside the playfield. The new covers capture actual rendered game states.

The preview APK retains the v1.2.0 signing certificate, so v1.2.0 can be upgraded without removing its local records. The earlier v1.1.0 signing migration still applies to installations of that older preview. See [gameplay verification](docs/GAMEPLAY_QA.md) for test coverage and known differences from the cartridges.

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
