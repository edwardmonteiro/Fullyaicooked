import test from 'node:test';
import assert from 'node:assert/strict';
import { Triathlon, Bike, Golf, terrainHeight, COURSES } from '../games/shared/sports/models.js';

const advance = (game, seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds * 120) && !game.done; i++) game.tick(1 / 120, typeof input === 'function' ? input(game) : input); };

test('triathlon completes all three legs; a finished round cannot keep scoring', () => {
  const game = new Triathlon(() => 0), seen = new Set();
  advance(game, 100, g => { seen.add(g.stage.name); return { pace: true }; });
  assert.deepEqual([...seen], ['Swim', 'Cycle', 'Run']); assert.equal(game.won, true); assert.equal(game.progress, 1);
  const score = game.score, time = game.time; advance(game, 5); assert.equal(game.score, score); assert.equal(game.time, time);
});
test('triathlon sprinting uses stamina and resting restores it', () => {
  const game = new Triathlon(() => 0);
  advance(game, 3, { pace: true }); assert(game.energy < 25); const energy = game.energy;
  advance(game, 2); assert(game.energy > energy + 20);
  assert(game.distance > 90, 'sprinting should cover more ground than walking pace');
});
test('triathlon markers collide only nearby and invulnerability prevents repeated hits', () => {
  const game = new Triathlon(() => 0); game.objects = [{ x: 94, y: 496, pickup: false }, { x: 210, y: 350, pickup: false }];
  game.tick(1 / 120); assert.equal(game.hearts, 3);
  game.objects = [{ x: 210, y: 495, pickup: false }, { x: 210, y: 495, pickup: false }];
  game.tick(1 / 120); assert.equal(game.hearts, 2);
});
test('bicycle wheels follow the trail and land after a jump', () => {
  const game = new Bike(); advance(game, 1);
  assert.equal(game.y, terrainHeight(game.x)); game.jump(); advance(game, 0.3);
  assert(game.y < terrainHeight(game.x) - 50); assert.equal(game.grounded, false);
  advance(game, 0.8); assert.equal(game.grounded, true); assert.equal(game.y, terrainHeight(game.x));
});
test('a jump clears the first rock, while a grounded bicycle collides', () => {
  const jumper = new Bike(), grounded = new Bike();
  for (const game of [jumper, grounded]) { game.x = 440; game.y = terrainHeight(440); game.speed = 225; }
  jumper.jump(); advance(jumper, 0.65, { pedal: true }); advance(grounded, 0.65, { pedal: true });
  assert.equal(jumper.hearts, 3); assert.equal(grounded.hearts, 2);
});
test('all nine trail obstacles are passable using the actual jump physics', () => {
  const game = new Bike();
  advance(game, 45, g => ({ pedal: true, jump: g.grounded && g.obstacles.some(rock => rock.x > g.x && rock.x - g.x < 95) }));
  assert.equal(game.won, true); assert.equal(game.hearts, 3); assert.equal(game.progress, 1);
});
test('golf accepts one shot at rest and rejects duplicate or invalid shots', () => {
  const game = new Golf(); assert.equal(game.shoot(NaN, 100), false); assert.equal(game.shoot(0, 0), false);
  assert.equal(game.shoot(0, -900), true); assert.equal(Math.hypot(game.ball.vx, game.ball.vy), 520);
  assert.equal(game.shoot(100, 100), false); assert.equal(game.strokes, 1);
});
test('golf ball rebounds from a wall without tunneling at full shot power', () => {
  const game = new Golf(); game.hole = 1; game.loadHole(); game.ball.x = 210; game.ball.y = 350;
  game.shoot(0, -520); advance(game, 0.15);
  assert(game.ball.y > 313); assert(game.ball.vy > 0); assert.equal(game.phase, 'play');
});
test('sand slows a golf ball more than fairway turf', () => {
  const sand = new Golf(), turf = new Golf();
  sand.hole = 2; sand.loadHole();
  for (const game of [sand, turf]) { Object.assign(game.ball, { x: 85, y: 290 }); game.shoot(0, -60); }
  advance(sand, 0.3); advance(turf, 0.3); assert(Math.abs(sand.ball.vy) < Math.abs(turf.ball.vy) / 2);
});
test('water adds exactly one penalty and returns the ball to the pre-shot position', () => {
  const game = new Golf(); game.hole = 3; game.loadHole(); Object.assign(game.ball, { x: 210, y: 400 });
  game.shoot(0, -200); advance(game, 2);
  assert.equal(game.strokes, 2); assert.equal(game.totalStrokes, 2); assert.equal(game.canShoot, true);
  assert.equal(game.ball.x, 210); assert.equal(game.ball.y, 400);
});
test('golf advances through six cups and freezes the final score', () => {
  const game = new Golf();
  for (let hole = 0; hole < 6; hole++) {
    assert.equal(game.hole, hole);
    Object.assign(game.ball, { x: COURSES[hole].cup[0], y: COURSES[hole].cup[1] + 22 });
    game.shoot(0, -60); advance(game, 2.5);
  }
  assert.equal(game.done, true); assert.equal(game.won, true); assert.equal(game.cards.length, 6); assert.equal(game.totalStrokes, 6);
  const score = game.score; game.tick(10); assert.equal(game.score, score);
});
test('golf picks up an unfinished hole after eight strokes', () => {
  const game = new Golf();
  for (let i = 0; i < 8; i++) { game.shoot(20, 0); advance(game, 1); }
  assert.equal(game.cards.length, 1); assert.equal(game.cards[0].pickedUp, true); assert.equal(game.cards[0].strokes, 8);
  advance(game, 2); assert.equal(game.hole, 1); assert.equal(game.canShoot, true);
});
