import { Timeline } from './timeline.js';
import { scenes, WIDTH, HEIGHT, PHONES } from './scenes.js';

const byId = id => document.getElementById(id);
const timeline = new Timeline(scenes);
const slide = byId('slide');
const viewport = byId('viewport');
const holder = byId('stage-holder');
const motion = byId('motion');
const patches = byId('patches');
const dialog = byId('simulation-dialog');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let frame = null;
let lastTime = 0;
let renderedScene = -1;
let captionKey = '';
let zoom = '1';
let ready = false;

const clamp = v => Math.min(1, Math.max(0, v));
const ease = v => { const x = clamp(v); return x * x * (3 - 2 * x); };
function patch(className, x, y, position = 0, id) {
  const element = document.createElement('div');
  element.className = `asset-patch ${className}`;
  if (id) element.id = id;
  Object.assign(element.style, {left:`${x}px`,top:`${y}px`,backgroundPosition:`0 ${position}px`});
  patches.append(element);
  return element;
}
const timerPatch = patch('', 1186, 482, 0, 'timer-patch');
const answerPatches = [494,607,720].map((y,i)=>patch('answer-patch',601,y,-35*i));
const statusPatches = [483,523,563].map((y,i)=>patch('status-patch',600,y,-37*i));

function fitSlide() {
  const style = getComputedStyle(viewport);
  const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const fit = Math.max(.01, Math.min(width / WIDTH, height / HEIGHT));
  const scale = zoom === 'actual' ? 1 : fit * Number(zoom);
  const snap = value => Math.round(value * devicePixelRatio) / devicePixelRatio;
  Object.assign(holder.style, {width:`${WIDTH * scale}px`,height:`${HEIGHT * scale}px`,marginTop:`${snap(Math.max(0,(height-HEIGHT*scale)/2))}px`,marginLeft:`${snap(Math.max(0,(width-WIDTH*scale)/2))}px`,marginRight:'0'});
  slide.style.transform = `scale(${scale})`;
  slide.dataset.scale = scale.toFixed(7);
}
new ResizeObserver(fitSlide).observe(viewport);

function haltClock() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastTime = 0;
}
function act(callback) {
  haltClock();
  callback();
  render();
  if (timeline.playing) startClock();
}
function onFrame(now) {
  frame = null;
  timeline.tick(now - lastTime);
  lastTime = now;
  render();
  if (timeline.playing) frame = requestAnimationFrame(onFrame);
}
function startClock() {
  if (frame !== null || !timeline.playing) return;
  lastTime = performance.now();
  frame = requestAnimationFrame(onFrame);
}
function pause() {
  if (timeline.playing && lastTime) timeline.tick(performance.now() - lastTime);
  haltClock();
  timeline.pause();
  render();
}
function playPause() {
  if (!ready || dialog.open) return;
  if (timeline.playing) pause();
  else act(()=>timeline.play());
}

function showSimulation(title, description) {
  pause();
  byId('dialog-title').textContent = title;
  byId('dialog-description').textContent = description;
  dialog.showModal();
}
function activateHotspot(hotspot) {
  if (!ready) return;
  if (hotspot.dialog) { showSimulation(...hotspot.dialog); return; }
  act(()=>{
    if (hotspot.scene !== undefined) timeline.reset(hotspot.scene);
    timeline.seek(hotspot.target);
    timeline.elapsed = hotspot.at || 0;
  });
}
function syncScene() {
  if (renderedScene === timeline.scene) return;
  renderedScene = timeline.scene;
  const scene = scenes[timeline.scene];
  byId('slide-image').src = scene.image;
  byId('slide-image').alt = scene.title + ' — มือถือสามเครื่องตามสไลด์ต้นฉบับ';
  byId('slide-description').textContent = scene.description;
  slide.setAttribute('aria-label',scene.title);
  byId('scene-select').value = String(timeline.scene);
  const fragment = document.createDocumentFragment();
  for (const hotspot of scene.hotspots) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hotspot';
    button.dataset.hotspot = hotspot.id;
    button.setAttribute('aria-label',hotspot.label);
    button.title = hotspot.label;
    const [x,y,w,h] = hotspot.box;
    Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    button.addEventListener('click',()=>activateHotspot(hotspot));
    fragment.append(button);
  }
  byId('hotspots').replaceChildren(fragment);
  history.replaceState(null,'',`#scene-${timeline.scene+1}`);
}
function rectangle(id, box, opacity = 1) {
  const element = byId(id);
  const [x,y,width,height] = box;
  for (const [key,value] of Object.entries({x,y,width,height,opacity})) element.setAttribute(key,String(value));
  element.style.visibility = 'visible';
}
function drawMotion() {
  for (const element of motion.children) element.style.visibility = 'hidden';
  for (const element of patches.children) element.style.display = 'none';
  slide.dataset.countdown = '45';
  if (timeline.step < 0) return;
  const current = timeline.current;
  const elapsed = timeline.elapsed;
  const fade = timeline.instantFocus || reducedMotion.matches ? 1 : ease(elapsed / 650);
  rectangle('phone-focus', PHONES[current.phone], .48 * fade);
  rectangle('highlight',current.box,.92 * fade);
  if (current.secondary) rectangle('highlight-secondary',current.secondary,.85*fade);

  if (timeline.scene === 0) {
    answerPatches.forEach((element,i)=>{
      const selectionStep = 4 + i;
      const opacity = timeline.step < selectionStep ? 1 : timeline.step > selectionStep ? 0 : 1-ease((elapsed-1300)/500);
      element.style.display = opacity > 0 ? 'block' : 'none';
      element.style.opacity = String(opacity);
    });
    if (timeline.step >= 10) {
      const progress = timeline.step === 10 ? clamp(elapsed / current.duration) : 1;
      const seconds = Math.max(0,45-Math.floor(progress*45));
      slide.dataset.countdown = String(seconds);
      timerPatch.style.display = 'block';
      timerPatch.style.backgroundPosition = `0 ${-(45-seconds)*52}px`;
      const ring = byId('countdown-progress');
      const circumference = 2 * Math.PI * 62;
      ring.setAttribute('stroke-dasharray',`${circumference}`);
      ring.setAttribute('stroke-dashoffset',`${progress*circumference}`);
      ring.setAttribute('opacity','.68');
      ring.style.visibility = timeline.step === 10 ? 'visible' : 'hidden';
    }
  } else {
    statusPatches.forEach((element,i)=>{
      const revealStep = 3 + i;
      const opacity = timeline.step < revealStep ? 1 : timeline.step > revealStep ? 0 : 1-ease(elapsed/700);
      element.style.display = opacity > 0 ? 'block' : 'none';
      element.style.opacity = String(opacity);
    });
  }
  if (current.cursor && !reducedMotion.matches) {
    const [start,end] = current.cursor;
    const p = ease((elapsed-250)/1050);
    const x = start[0]+(end[0]-start[0])*p;
    const y = start[1]+(end[1]-start[1])*p;
    const cursor = byId('demo-cursor');
    cursor.setAttribute('transform',`translate(${x} ${y})`);
    cursor.setAttribute('opacity',String(ease(elapsed/300)));
    cursor.style.visibility = 'visible';
    const clickProgress = (elapsed-current.click)/650;
    if (clickProgress >= 0 && clickProgress <= 1) {
      const ripple = byId('click-ripple');
      ripple.setAttribute('cx',String(end[0]));
      ripple.setAttribute('cy',String(end[1]));
      ripple.setAttribute('r',String(8+29*ease(clickProgress)));
      ripple.setAttribute('opacity',String(1-clickProgress));
      ripple.style.visibility = 'visible';
    }
  }
}
function render() {
  syncScene();
  drawMotion();
  slide.dataset.scene = String(timeline.scene);
  slide.dataset.step = String(timeline.step);
  slide.dataset.elapsed = String(Math.round(timeline.elapsed));
  slide.dataset.playing = String(timeline.playing);
  const key = `${timeline.scene}:${timeline.step}`;
  if (key !== captionKey) {
    captionKey = key;
    byId('step-count').textContent = timeline.step < 0 ? 'ภาพต้นฉบับ' : `ขั้น ${timeline.step+1} / ${timeline.steps.length}`;
    byId('step-caption').textContent = timeline.current?.caption || 'กดเล่น หรือกดปุ่มในสไลด์เพื่อเริ่มสาธิต';
  }
  byId('play-label').textContent = timeline.playing ? 'หยุด' : 'เล่น';
  byId('play-icon').textContent = timeline.playing ? 'Ⅱ' : '▶';
  byId('play').setAttribute('aria-label',timeline.playing ? 'หยุดชั่วคราว' : 'เล่น');
  byId('play').setAttribute('aria-pressed',String(timeline.playing));
  byId('back').disabled = timeline.step < 0;
  byId('next').disabled = timeline.step === timeline.steps.length-1;
  byId('progress-fill').style.transform = `scaleX(${timeline.progress})`;
  byId('progress').setAttribute('aria-valuenow',String(Math.round(timeline.progress*100)));
}
function toggleControls() {
  const hide = !byId('controls').hidden;
  byId('controls').hidden = hide;
  byId('restore-bar').hidden = !hide;
  (hide ? byId('show-controls') : byId('hide-controls')).focus({preventScroll:true});
  fitSlide();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (byId('presenter').requestFullscreen) await byId('presenter').requestFullscreen();
    else showSimulation('แสดงเต็มจอ','เบราว์เซอร์นี้ไม่รองรับปุ่มเต็มจอ ใช้โหมดแนวนอนและซ่อนแถบควบคุมเพื่อเพิ่มพื้นที่นำเสนอได้');
  } catch {
    showSimulation('แสดงเต็มจอ','เบราว์เซอร์ไม่อนุญาตให้เปิดเต็มจอในขณะนี้ คุณยังซ่อนแถบควบคุมเพื่อเพิ่มพื้นที่นำเสนอได้');
  }
}

byId('play').addEventListener('click',playPause);
byId('next').addEventListener('click',()=>act(()=>timeline.next()));
byId('back').addEventListener('click',()=>act(()=>timeline.back()));
byId('reset').addEventListener('click',()=>act(()=>timeline.reset()));
byId('scene-select').addEventListener('change',event=>act(()=>timeline.reset(Number(event.target.value))));
byId('continuous').addEventListener('change',event=>{ timeline.continuous = event.target.checked; });
byId('zoom').addEventListener('change',event=>{zoom=event.target.value;fitSlide();viewport.scrollTo({top:0,left:0});});
byId('fullscreen').addEventListener('click',fullscreen);
byId('hide-controls').addEventListener('click',toggleControls);
byId('show-controls').addEventListener('click',toggleControls);
byId('close-dialog').addEventListener('click',()=>dialog.close());
document.addEventListener('fullscreenchange',()=>{
  const active = Boolean(document.fullscreenElement);
  byId('fullscreen').setAttribute('aria-label',active?'ออกจากเต็มจอ':'เต็มจอ');
  fitSlide();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden && timeline.playing) pause();});
window.addEventListener('hashchange',()=>{
  const index = location.hash === '#scene-2' ? 1 : 0;
  if (index !== timeline.scene) act(()=>timeline.reset(index));
});
document.addEventListener('keydown',event=>{
  if (event.altKey || event.ctrlKey || event.metaKey || dialog.open || event.repeat) return;
  if (event.target.matches('select,input,textarea,[contenteditable="true"]')) return;
  const key = event.key.toLowerCase();
  if (key === ' ' && event.target.matches('.hotspot')) return; // Native accessible button activation.
  if (key === ' ') { event.preventDefault(); playPause(); }
  else if (key === 'arrowright') { event.preventDefault(); act(()=>timeline.next()); }
  else if (key === 'arrowleft') { event.preventDefault(); act(()=>timeline.back()); }
  else if (key === 'r') act(()=>timeline.reset());
  else if (key === 'h') toggleControls();
  else if (key === 'f') fullscreen();
});

timeline.reset(location.hash === '#scene-2' ? 1 : 0);
render();
fitSlide();
byId('play').disabled = true;
const imageAssets = ['scene-1.png','scene-2.png','countdown-atlas.png','answer-neutral-atlas.png','status-neutral-atlas.png'];
Promise.all(imageAssets.map(name=>{
  const image = new Image();
  image.src = `./assets/${name}`;
  return image.decode();
})).then(()=>document.fonts.ready).then(()=>{
  ready = true;
  byId('play').disabled = false;
  slide.dataset.ready = 'true';
}).catch(()=>{
  byId('step-caption').textContent = 'โหลดภาพไม่ครบ กรุณารีเฟรชหน้าเว็บอีกครั้ง';
  slide.dataset.ready = 'error';
});
