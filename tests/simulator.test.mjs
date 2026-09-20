import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulator, TRANSITION_MS, COUNTDOWN_MS, PROTECTION_MS } from '../src/simulator.js';
import { scenes } from '../src/scenes.js';

test('one-phone simulator starts on the first screen and waits for a tap',()=>{
  const m=new Simulator(scenes);m.tick(60000);
  assert.equal(m.key,'0:0');assert.equal(m.mode,'manual');assert.equal(m.running,false);
  m.checkRisk();assert.equal(m.key,'0:1');assert.equal(m.transition.from,'0:0');
  m.tick(TRANSITION_MS);assert.equal(m.transition,null);
  m.tick(60000);assert.equal(m.key,'0:1');assert.equal(m.running,false);
});
test('questions accept and replace yes and no choices; advice requires all three',()=>{
  const m=new Simulator(scenes);m.checkRisk();m.tick(TRANSITION_MS);
  assert.equal(m.advice(),false);assert.equal(m.screen,1);
  m.answer(0,true);m.answer(1,false);m.answer(2,true);
  assert.deepEqual(m.questionAnswers,[true,false,true]);
  m.answer(1,true);assert.deepEqual(m.questionAnswers,[true,true,true]);
  m.tick(500);assert.equal(m.reviewCover,0);assert.equal(m.advice(),true);
  assert.equal(m.key,'0:2');
});
test('manual countdown remains on the hold screen even after expiry',()=>{
  const m=new Simulator(scenes);m.next();m.next();m.tick(TRANSITION_MS);m.tick(COUNTDOWN_MS);
  assert.equal(m.key,'0:2');assert.equal(m.countdown,0);assert.equal(m.running,false);
  m.tick(999999);assert.equal(m.key,'0:2');
});
test('pause freezes the transition, tap ripple and countdown; resume preserves progress',()=>{
  const m=new Simulator(scenes);m.next();m.next();m.tap={x:30,y:60,elapsed:0};m.tick(120);m.playPause();
  const before=JSON.stringify(m);m.tick(9000);assert.equal(JSON.stringify(m),before);
  m.playPause();m.tick(100);assert.equal(m.transition.elapsed,220);assert.equal(m.tap.elapsed,220);
  m.tick(1000);m.playPause();const seconds=m.countdown;const held=m.holdElapsed;
  m.tick(6000);assert.equal(m.holdElapsed,held);assert.equal(m.countdown,seconds);
  m.playPause();m.tick(500);assert.ok(m.holdElapsed>held);
});
test('emergency statuses reveal sequentially and reporting opens the same device tracking screen',()=>{
  const m=new Simulator(scenes);m.reset(1);m.emergency();m.tick(TRANSITION_MS);
  assert.equal(m.key,'1:1');assert.equal(m.report(),false);
  assert.ok(m.statusCover(0)<m.statusCover(1));assert.equal(m.statusCover(2),1);
  m.tick(PROTECTION_MS);assert.deepEqual([0,1,2].map(i=>m.statusCover(i)),[0,0,0]);
  assert.equal(m.report(),true);assert.equal(m.key,'1:2');
});
test('reset and scene switching cancel pending state and restore the selected first screen',()=>{
  const m=new Simulator(scenes);m.checkRisk();m.answer(0,true);m.startAuto();m.tick(20000);
  m.reset(1);m.tick(999999);
  assert.equal(m.key,'1:0');assert.equal(m.mode,'manual');assert.equal(m.transition,null);
  assert.equal(m.tap,null);assert.equal(m.holdElapsed,0);assert.equal(m.protectionElapsed,0);
  assert.deepEqual(m.answers,[null,null,null]);assert.equal(m.running,false);
});
test('back and next during auto playback take manual control without another phone',()=>{
  const m=new Simulator(scenes);m.startAuto();m.tick(16000);assert.equal(m.screen,1);
  m.back();assert.equal(m.key,'0:0');assert.equal(m.mode,'manual');assert.equal(m.timeline.playing,false);
  m.next();assert.equal(m.key,'0:1');m.tick(60000);assert.equal(m.key,'0:1');
});
test('optional auto walkthrough visits all six screens and 26 cues then stops',()=>{
  const m=new Simulator(scenes);m.startAuto();const screens=new Set(),steps=new Set();
  for(let i=0;i<1800&&m.running;i++){screens.add(m.key);steps.add(`${m.scene}:${m.timeline.step}`);m.tick(100);}
  assert.equal(screens.size,6);assert.equal(steps.size,26);assert.equal(m.key,'1:2');assert.equal(m.running,false);
});
test('single-step automatic playback continues from the next cue instead of restarting a screen',()=>{
  const m=new Simulator(scenes);m.timeline.continuous=false;m.startAuto();m.tick(60000);
  assert.equal(m.timeline.step,0);assert.equal(m.running,false);
  m.playPause();assert.equal(m.timeline.step,1);m.tick(60000);assert.equal(m.timeline.step,1);
  assert.equal(m.running,false);
});
