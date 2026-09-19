# Gameplay verification

## Rules and completion

`npm run check` passes 25 tests. Tests exercise the actual game models, without changing speed, gravity, jump height, collision sizes, health, or course geometry:

- All four rally circuits reach their finish through traffic and timed checkpoints.
- All five Breaker sectors can be cleared. Armor, multiball, widened paddles, and shield rebounds have targeted checks.
- All four Stack towers are reachable; imperfect overlap loses width and three perfect drops restore it. Focus consumes charge.
- All three triathlon championships have a qualifying route through swimming, cycling, and running; drafting reduces stamina consumption.
- All three bike trails, including every marked gap, can be completed without a fall. Respawns use the saved checkpoint.
- All nine golf holes have reproducible legal shot routes at or below par, stored in `tests/fixtures/golf-routes.json`. The trajectory preview leaves the live model unchanged. Cups finish after three holes.
- Campaign storage preserves better medals and scores, unlocks the next stage, and tolerates unavailable or malformed storage.

These route tests prove that the levels are possible. They do not measure enjoyment or demonstrate that a new player can clear them on the first attempt.

## Browser and packaging scope

The rendered games were reviewed in Chrome through the supervised local preview. Checks cover starting from the marketplace, playing fields and controls, scoring, pause, and switching games. The three sports games were also inspected inside a 390 × 780 viewport fixture to check narrow layout, with the control deck kept below the canvas. The temporary viewport fixture is excluded from the published build.

Browser checks are short interaction sessions, not human playthroughs of every campaign. No physical Android device or real multi-finger touchscreen was available; native touch ergonomics, audio latency, battery use, and sustained frame rate still require device testing. The APK is compiled from the same bundled game code, checked for the expected package/version and contents, and signature-verified.

## Remaining release limits

- Campaign progress is local to one browser or app installation.
- The APK is a signed debug preview, not a Play Store release. This delivery uses a new debug signing certificate because the previous temporary key was unavailable. Existing installations of the earlier preview must be uninstalled before installing this APK; uninstalling clears their local app progress. Keep the preview signing key for subsequent builds to avoid repeating that migration.
- Advertising remains in test mode; test impressions do not produce revenue.

## 2600 Tributes — v1.3.0

The full check now passes 36 tests, including 11 new model tests. Reproducible controllers in `tests/fixtures/retro-routes.mjs` send normal directional/action inputs to the unmodified models. They clear six river bridges with three jets intact, qualify through two complete Enduro days, and traverse the first vine, crocodile and opening-sand rooms to collect the first Pitfall treasure without dying. Other tests cover repeated life loss, checkpoint respawns, fuel use/destruction, extra lives, gas release/braking, weather, reversal of overtakes, ladders, tunnel wrapping, the treasure count and time expiry.

The tributes intentionally use original river routes and jungle arrangements. Enduro days last 120 seconds. Movement, collision boxes, sprite bitmaps and sound synthesis were independently implemented. The river alternates mirrored authored routes and narrows over successive bridges; it does not reproduce the original ROM's procedural generator. Pitfall's 255-room layout is authored from repeatable patterns and does not reproduce its cartridge map. These are gameplay tributes, not emulation or frame-perfect ports. No ROMs, extracted graphics or original recordings are bundled.

Historical reference: [the original Enduro manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=163) supports the 200/300 daily passing quotas, maintaining speed after releasing the accelerator, braking, ice, night and fog. The independent implementations and explicit differences are the basis for the remaining behavior descriptions.

The v1.3.0 APK preserves the v1.2.0 preview signing certificate and bumps the version code to 4. Earlier v1.1.0 installations still require the signing migration described above. Physical Android touch/gamepad testing and a full twenty-minute, 32-treasure human playthrough remain outstanding.

Browser QA for the tributes covered Chrome at 1363 × 941 and a 390 × 780 iframe viewport: marketplace launch, intro-to-game transition, pixel playfields, River Raid pause/resume controls, Enduro acceleration (0 → 35 km/h) and maintained speed after release, and Pitfall directional/jump button activation with the player visibly airborne. No relevant application errors or framework overlays were observed. Browser interactions are sampled checks, not complete human runs; real multi-touch and physical gamepad input remain untested.


## Mobile Arcade verification — v1.4.0

The full check passes 47 tests. Eleven new checks cover all three modern games. Legal-input controllers in `tests/fixtures/mobile-routes.mjs` finish every new mission without altering physics, collisions, player health or level geometry. Observed winning routes take approximately 49/55/68 seconds in Starfall Patrol, 41/46/51 seconds in Sunset Rider, and 79/84/94 seconds in Sky Bastion. These are automated route times, not promised human completion times.

The checks also cover losing through inaction; frozen terminal states; speed-limited ship movement; finite pulse charges; damage cooldown and shield/double-fire pickups; open traffic lanes and boost consumption; defense recharge, firing limits, finite explosions, splitters and chain reactions; independent campaign saves; and a twelve-game catalog with valid portrait bundles. The shooter replenishes one hull point and one pulse before the sentinel, then widens its bullet fans in later missions.

Chrome interaction checks cover the Mobile Arcade filter, marketplace launch, game-over/replay, mission selection, drag flight, consuming a pulse, lane changes, holding Turbo, tap-to-fire energy use, EMP cooldown, pause and resume. Desktop and 390×780 iframe viewports were inspected. The test harness is temporary and excluded from the website and APK. Physical Android touch, simultaneous fingers, audio latency and sustained device frame rate remain untested. Automated routes establish that levels can be completed; they do not establish human enjoyment.

The source separates deterministic rules, canvas rendering and browser input. Scenery and sprite atlases are generated production art with transparent sprites and runtime crops. Lasers, missile trajectories, explosions, particles, hit indicators, HUD text and control icons are deliberately code-rendered for animation and exact alignment. The art direction is a modern illustrated mobile arcade; these are original games, not cartridge emulations.

The APK is version 1.4.0-preview (code 5), has the same preview certificate as v1.2/v1.3, includes all twelve games offline and sends the existing round-complete ad event only after a mission ends. Test ads remain enabled; this update does not activate revenue.

### Visual fidelity review

The accepted three-screen concept is `docs/visual/modern-arcade-concept.webp` (1619×971); `asset-manifest.json` records the built-in ImageGen prompts and atlas crop metadata. Browser screenshots were captured through the browser runtime and inspected alongside the concept with `view_image`. The browser viewport is 1363×941, so the complete 1619px concept board cannot be shown at native width; individual games were checked at 390×780 and the compact menu at 844×390 instead.

| Comparison | Concept and rendered evidence | Decision / fix |
| --- | --- | --- |
| Layout | Thin navy title/score/lives HUD, dominant portrait playfield, narrow controls below | Preserved; added a compact action deck for Pulse/Turbo/EMP and keyboard-accessible buttons |
| Palette | Indigo space, apricot road shoulders, blue-violet coastal sky | Production atlases preserve all three palettes; no overlay tint in gameplay |
| Artwork | Teal player craft/rider, coral threats, illustrated backgrounds | Dedicated transparent sprite/scenery pass; tight crops corrected vehicle size and centers |
| Typography/icons | Tracked uppercase compact labels, bold tabular score, coral hearts, rounded pause | Implemented in native HTML/SVG, consistent across all three |
| Copy | Exact game titles and the three gesture hints | Preserved; mission/wave, energy and progress text intentionally added because these are playable campaigns |
| Controls/responsiveness | Gameplay remains unobstructed | Buttons below canvas; short-landscape menu changed to two columns so Start remains visible |
| Motion/effects | Cyan shots/bursts, coral incoming trails | Animated native effects; reduced-motion disables shake, extra stars and road scrolling |

Above-the-fold copy was compared against the concept. Intentional additions are mission selection/instructions, live mission detail, energy/charge readout, pause/result messages and stars. Functional controls and menus are deliberate extensions of the gameplay-only concept. No unresolved material layout or asset-loading mismatches remained in the inspected states. The implementation was verified against the selected visual direction; this is not a claim of pixel-identical raster UI. No relevant application console errors or framework overlays were observed; browser-extension metadata errors were unrelated to the game.
