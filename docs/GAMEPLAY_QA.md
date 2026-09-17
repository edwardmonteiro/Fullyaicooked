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
