# Gameplay verification — Championship update

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
