# Nostalgia collection QA — v1.7.0

## Scope

Three new independently written HTML5 games, bringing the catalog to 21. Runtime and models live under `games/shared/nostalgia`. The 384×288 playfield uses original functional bitmap/rectangle geometry. The previous generated phosphor texture is reused only for the optional CRT setting. New catalog covers capture the actual browser-rendered game fields.

## Source rules and authored boundaries

- Fishing Derby: [Activision manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=182). Six depth rows, 2/4/6-pound fish, first to 99, bait near the mouth, first-hook priority for rapid reeling, automatic slow ascent, lateral movement and a fish-stealing shark. Opponent decisions, trajectories and bite tolerances are original.
- Combat: [Atari manual](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=94). 136-second rounds, point per hit, continuously moving aircraft, hiding clouds that do not stop bullets, straight and rapid-fire shots. This is an aircraft subset with an original computer opponent, unified turn/speed touch controls and authored stun/immunity timings. Tanks and multi-aircraft formations are not included. The opponent retains its last observation while the player is hidden by a cloud.
- Keystone Kapers: [Activision manual](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=261). Jump/duck, scheduled elevator access, upward escalators and roof-only escape, map, 9-second obstacle penalties, lethal toy aircraft, 50-point loot, four initial police, extra police each 10,000 points up to four, capture multipliers 100/200/300 for phases 1–8/9–16/17+. The 1,152-unit store, routes, obstacles, 50-second round and elevator timings are authored. Each failed attempt restarts the current phase.

No cartridge ROM, extracted sprite or frame-exact emulation claim. Ads remain in test mode and emit only after a finished game, not between arrests or upon pause/restart.

## Automated validation

`npm run check`: 87 passing tests (71 existing, 16 added). No game health or position mutation is used in full-run fixtures.

- Fishing: complete victories in all three modes using ordinary directional and reel inputs, plus loss with no input. Separate checks for mouth contact, weights, reel priority and shark theft.
- Combat: three complete winning 136-second matches using ordinary turn, speed and fire inputs. Checks cover active-shot caps, cloud concealment, aircraft geometry, crossing screen seams and final-state freezing.
- Keystone: nine consecutive arrests with normal jump/duck/elevator inputs. An independent stair-only route completes another arrest. Focused fixtures verify floor access, timed doors, ducking, penalties, all three life-loss causes, score multipliers and extra-life cap.

## Browser and Android checks

Real Android hardware, real multi-touch/gamepad, sustained frame pacing and testing with older adults remain unverified. Model route tests establish playability, not human difficulty ratings.


- Browser: 390×780 phone screens for all three games; Combat layout and pause menu at 780×390; Keystone play at 740×780. Fishing start/replay, pointer placement, reel, keyboard-accessible help, pause/resume and a CPU victory with one round-complete event were checked. Combat turn/fire, pause/resume and jet selection worked. Keystone run/jump, pause and timer/life progression worked. The catalog displayed 21 games. No application console errors were observed; browser-extension metadata errors were excluded. Full wins above are model tests, not complete human/browser playthroughs.
- Visual: 4:3 fields preserve geometry in all reviewed layouts. Titles, score strips and touch targets fit. Increased fishing arrow size and corrected Enter handling for menu controls. Final catalog covers are cursor-free gameplay captures; Combat's cover shows its open-sky jet variant.
- Android: offline Gradle assembleDebug succeeded. Package `com.fullyaicooked.arcade.preview`, version `1.7.0-preview`, code 8, minSdk 23, targetSdk 36. All 125 bundled files match the synced asset directory, including the final three covers and new modules. No QA route or key is packaged.
- Signatures v1/v2 verified. Certificate SHA-256 remains `e90a1881b5c35840cab41e02fc1b770be7dc884ce184b1fb540f906fe125638e`.
- APK SHA-256: `4a50f056e7f19f850fdab332f7d6ab0dd02e6dcffd102bb746e2e557033ba93f`; 9,974,145 bytes.
