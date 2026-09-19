import test from 'node:test';
import assert from 'node:assert/strict';
import { Timeline } from '../src/timeline.js';
import { scenes } from '../src/scenes.js';

test('pause freezes exact elapsed time and resume keeps the same countdown position',()=>{
  const t=new Timeline(scenes);t.seek(10);t.play();t.tick(4600);t.pause();
  t.tick(10000);assert.equal(t.elapsed,4600);assert.equal(t.step,10);
  t.play();t.tick(500);assert.equal(t.elapsed,5100);
});
test('reset invalidates playback and restores the untouched slide',()=>{
  const t=new Timeline(scenes);t.seek(10);t.play();t.tick(12000);t.reset();t.tick(80000);
  assert.equal(t.step,-1);assert.equal(t.elapsed,0);assert.equal(t.playing,false);assert.equal(t.progress,0);
});
test('next, back and scene switching pause and clear elapsed state',()=>{
  const t=new Timeline(scenes);t.play();t.tick(1300);t.next();
  assert.equal(t.step,1);assert.equal(t.elapsed,0);assert.equal(t.playing,false);
  t.back();t.back();assert.equal(t.step,-1);
  t.play();t.tick(1400);t.reset(1);t.tick(100000);
  assert.equal(t.scene,1);assert.equal(t.step,-1);assert.equal(t.elapsed,0);
});
test('continuous mode walks through both scenes and stops at the end without looping',()=>{
  const t=new Timeline(scenes);t.play();
  const visited=[];
  for(let i=0;i<2000&&t.playing;i++){t.tick(100);const key=`${t.scene}:${t.step}`;if(!visited.includes(key))visited.push(key);}
  assert.equal(visited.length,scenes[0].steps.length+scenes[1].steps.length);
  assert.equal(t.scene,1);assert.equal(t.step,13);assert.equal(t.playing,false);assert.equal(t.progress,1);
});
test('turning continuous off finishes only the current step',()=>{
  const t=new Timeline(scenes);t.continuous=false;t.play();t.tick(999999);
  assert.equal(t.scene,0);assert.equal(t.step,0);assert.equal(t.elapsed,scenes[0].steps[0].duration);assert.equal(t.playing,false);
  t.play();assert.equal(t.step,1);assert.equal(t.elapsed,0);
});
test('countdown expiry goes to the held-transaction explanation only',()=>{
  const t=new Timeline(scenes);t.seek(10);t.play();t.tick(15000);
  assert.equal(t.step,11);assert.match(t.current.caption,/ไม่มีการโอนต่ออัตโนมัติ/);
});
test('all hotspots remain within the original slide and every step has a readable duration',()=>{
  for(const scene of scenes){
    for(const h of scene.hotspots){const[x,y,w,hg]=h.box;assert.ok(x>=0&&y>=0&&x+w<=1536&&y+hg<=1024);}
    for(const s of scene.steps)assert.ok(s.duration>=2400);
  }
});
