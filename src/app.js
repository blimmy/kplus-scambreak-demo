import { Simulator, ease, TRANSITION_MS, PROTECTION_MS } from './simulator.js';
import { scenes } from './scenes.js';

const $=id=>document.getElementById(id);
const model=new Simulator(scenes);
const WIDTH=440,HEIGHT=828,SCREEN_WIDTH=388,SCREEN_HEIGHT=778;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const names=[['ตรวจสอบข้อมูล','เบรกก่อนโอน','พักรายการโอน'],['หน้าแรก','โหมดฉุกเฉิน','ติดตามเรื่อง']];
let frame=null,lastTime=0,active=null,outgoing=null,zoom='1',ready=false,lastCaption='';

function fitPhone(){
  const style=getComputedStyle($('viewport'));
  const width=$('viewport').clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const height=$('viewport').clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const fit=Math.max(.01,Math.min(width/WIDTH,height/HEIGHT));
  const scale=zoom==='actual'?1:fit*Number(zoom);
  const snap=v=>Math.round(v*devicePixelRatio)/devicePixelRatio;
  Object.assign($('stage-holder').style,{width:`${WIDTH*scale}px`,height:`${HEIGHT*scale}px`,marginTop:`${snap(Math.max(0,(height-HEIGHT*scale)/2))}px`,marginLeft:`${snap(Math.max(0,(width-WIDTH*scale)/2))}px`,marginRight:'0'});
  $('phone').style.transform=`scale(${scale})`;
  $('phone').dataset.scale=scale.toFixed(7);
}
new ResizeObserver(fitPhone).observe($('viewport'));

function stopClock(){if(frame!==null)cancelAnimationFrame(frame);frame=null;lastTime=0;}
function startClock(){if(frame!==null||!model.running)return;lastTime=performance.now();frame=requestAnimationFrame(tick);}
function tick(now){frame=null;model.tick(now-lastTime);lastTime=now;render();if(model.running)frame=requestAnimationFrame(tick);}
function act(action){
  if(lastTime&&model.running)model.tick(performance.now()-lastTime);
  stopClock();action();render();startClock();
}

function createPatch(layer,className,x,y,w,h,position=0){
  const element=document.createElement('div');
  element.className=`asset-patch ${className}`;
  Object.assign(element.style,{left:`${x-layer.origin[0]}px`,top:`${y-layer.origin[1]}px`,width:`${w}px`,height:`${h}px`,backgroundPosition:`0 ${position}px`});
  layer.patches.append(element);return element;
}
function addButton(layer,hotspot){
  const button=document.createElement('button');
  button.className='hotspot';button.type='button';button.dataset.hotspot=hotspot.id;
  button.setAttribute('aria-label',hotspot.label);
  const [x,y,w,h]=hotspot.box;
  Object.assign(button.style,{left:`${x-layer.origin[0]}px`,top:`${y-layer.origin[1]}px`,width:`${w}px`,height:`${h}px`});
  button.addEventListener('click',()=>activate(hotspot,layer));
  layer.hotspots.append(button);return button;
}
function buildLayer(scene,screen){
  const layer={scene,screen,key:`${scene}:${screen}`,origin:[94+480*screen,182]};
  layer.element=document.createElement('div');layer.element.className='screen-layer';layer.element.dataset.route=layer.key;
  const image=new Image(SCREEN_WIDTH,SCREEN_HEIGHT);
  image.src=`./assets/phone/scene-${scene+1}-screen-${screen+1}.png`;
  image.className='screen-image';image.draggable=false;image.alt=names[scene][screen];
  layer.element.append(image);
  layer.patches=document.createElement('div');layer.patches.className='screen-patches';layer.patches.setAttribute('aria-hidden','true');layer.element.append(layer.patches);
  if(scene===0&&screen===1){
    layer.answers=[494,607,720].map((y,i)=>createPatch(layer,'answer-patch',601,y,156,35,-35*i));
    layer.noAnswers=[494,607,720].map((y,i)=>createPatch(layer,'answer-no-patch',601,y,334,35,-35*i));
    layer.review=createPatch(layer,'review-patch',588,789,360,90);
  }
  if(scene===0&&screen===2)layer.timer=createPatch(layer,'timer-patch',1186,482,124,52);
  if(scene===1&&screen===1)layer.statuses=[483,523,563].map((y,i)=>createPatch(layer,'status-patch',600,y,340,37,-37*i));
  layer.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  layer.svg.classList.add('screen-motion');layer.svg.setAttribute('viewBox',`${layer.origin[0]} 182 388 778`);layer.svg.setAttribute('aria-hidden','true');
  layer.svg.innerHTML='<rect class="highlight" rx="12" fill="none" stroke="#00a58b" stroke-width="2.5"/><rect class="secondary" rx="10" fill="none" stroke="#d99313" stroke-width="2.5"/><circle class="countdown-progress" cx="1248" cy="522" r="62" fill="none" stroke="#08aa8f" stroke-width="4" stroke-linecap="round" transform="rotate(-90 1248 522)"/><circle class="click-ripple" r="0" fill="none" stroke="#00a58b" stroke-width="3"/><g class="demo-cursor"><path d="M0 0 L4 29 L11 22 L17 34 L23 31 L17 19 L27 18 Z" fill="#fff" stroke="#163d43" stroke-width="2" stroke-linejoin="round"/></g>';
  layer.element.append(layer.svg);
  layer.hotspots=document.createElement('div');layer.hotspots.className='screen-hotspots';layer.element.append(layer.hotspots);
  for(const hotspot of scenes[scene].hotspots){
    if(Math.floor(hotspot.box[0]/480)!==screen || /^(protection-|status-|case$)/.test(hotspot.id))continue;
    const data={...hotspot};
    if(/^answer-no-/.test(data.id))data.label=scenes[scene].hotspots.find(h=>h.id===`answer-${data.id.slice(-1)}`).label.replace('เลือกใช่','เลือกไม่ใช่');
    addButton(layer,data);
  }
  if(screen>0)addButton(layer,{id:'phone-back',label:'ย้อนกลับหน้าก่อนหน้า',box:[layer.origin[0]+8,225,38,36]});
  return layer;
}

function syncScreen(){
  if(!active||active.key!==model.key){
    if(outgoing){outgoing.element.remove();outgoing=null;}
    if(active){
      if(model.transition&&model.transition.from===active.key){outgoing=active;outgoing.element.inert=true;outgoing.element.setAttribute('aria-hidden','true');outgoing.element.style.opacity='1';}
      else active.element.remove();
    }
    active=buildLayer(model.scene,model.screen);$('screen-layers').append(active.element);
    $('scene-select').value=String(model.scene);
    $('phone').setAttribute('aria-label',`${scenes[model.scene].title} · ${names[model.scene][model.screen]}`);
    $('phone-description').textContent=`มือถือจำลองหนึ่งเครื่อง หน้า ${names[model.scene][model.screen]} กดปุ่มบนหน้าจอเพื่อใช้งาน ข้อมูลทั้งหมดเป็นข้อมูลสมมติ`;
    history.replaceState(null,'',`#scene-${model.scene+1}`);
  }
  if(!model.transition&&outgoing){outgoing.element.remove();outgoing=null;}
  active.element.style.opacity=model.transition&&!reducedMotion.matches?String(ease((model.transition.elapsed-100)/(TRANSITION_MS-100))):'1';
  active.element.inert=Boolean(model.transition);
}
function rectangle(svg,selector,box,opacity){
  const node=svg.querySelector(selector);
  for(const[key,value]of Object.entries({x:box[0],y:box[1],width:box[2],height:box[3],opacity}))node.setAttribute(key,String(value));
  node.style.visibility='visible';
}
function draw(){
  const layer=active;
  for(const element of layer.svg.children)element.style.visibility='hidden';
  if(layer.answers){
    layer.answers.forEach((element,i)=>{element.style.opacity=String(model.answerCover(i));});
    layer.noAnswers.forEach((element,i)=>{element.style.display=model.questionAnswers[i]===false?'block':'none';});
    layer.review.style.opacity=String(model.reviewCover);
    for(const button of layer.hotspots.children){
      const match=button.dataset.hotspot.match(/^answer-(no-)?([123])$/);
      if(match)button.setAttribute('aria-pressed',String(model.questionAnswers[Number(match[2])-1]===(match[1]?false:true)));
      if(button.dataset.hotspot==='advice')button.setAttribute('aria-disabled',String(model.questionAnswers.some(v=>v===null)));
    }
  }
  if(layer.statuses){
    layer.statuses.forEach((element,i)=>element.style.opacity=String(model.statusCover(i)));
    const report=layer.hotspots.querySelector('[data-hotspot="report"]');
    report?.setAttribute('aria-disabled',String(model.mode==='manual'&&model.protectionElapsed<PROTECTION_MS));
  }
  if(layer.timer){
    layer.timer.style.display=model.countdown===45?'none':'block';
    layer.timer.style.backgroundPosition=`0 ${-(45-model.countdown)*52}px`;
    const progress=layer.svg.querySelector('.countdown-progress');
    const total=2*Math.PI*62;
    progress.setAttribute('stroke-dasharray',String(total));
    progress.setAttribute('stroke-dashoffset',String(total*(1-model.countdown/45)));
    progress.setAttribute('opacity','.6');
    progress.style.visibility=model.countdown>0&&model.countdown<45?'visible':'hidden';
  }
  if(model.cue){
    const cue=model.cue,elapsed=model.timeline.elapsed;
    const fade=reducedMotion.matches||model.timeline.instantFocus?1:ease(elapsed/650);
    rectangle(layer.svg,'.highlight',cue.box,.85*fade);
    if(cue.secondary)rectangle(layer.svg,'.secondary',cue.secondary,.75*fade);
    if(cue.cursor&&!reducedMotion.matches){
      const[start,end]=cue.cursor,p=ease((elapsed-250)/1050);
      const cursor=layer.svg.querySelector('.demo-cursor');
      cursor.setAttribute('transform',`translate(${start[0]+(end[0]-start[0])*p} ${start[1]+(end[1]-start[1])*p})`);
      cursor.setAttribute('opacity',String(ease(elapsed/300)));cursor.style.visibility='visible';
      const click=(elapsed-cue.click)/650;
      if(click>=0&&click<=1){const ring=layer.svg.querySelector('.click-ripple');ring.setAttribute('cx',end[0]);ring.setAttribute('cy',end[1]);ring.setAttribute('r',8+29*ease(click));ring.setAttribute('opacity',1-click);ring.style.visibility='visible';}
    }
  }
  const tap=$('tap-ripple');tap.style.visibility=model.tap?'visible':'hidden';
  if(model.tap){const t=model.tap.elapsed/650;tap.setAttribute('cx',model.tap.x);tap.setAttribute('cy',model.tap.y);tap.setAttribute('r',6+25*ease(t));tap.setAttribute('opacity',1-t);}
}
function caption(){
  if(model.notice)return model.notice;
  if(model.mode==='auto'&&model.cue)return model.cue.caption;
  if(model.scene===0){
    if(model.screen===0)return 'กด “ตรวจสอบความเสี่ยง” บนหน้าจอมือถือเพื่อเริ่ม';
    if(model.screen===1){const count=model.answers.filter(v=>v!==null).length;return count<3?`เลือกคำตอบบนหน้าจอ (${count}/3 ข้อ) แล้วกด “ดูคำแนะนำ”`:'ตอบครบแล้ว · กด “ดูคำแนะนำ” เพื่อพักรายการ';}
    return model.countdown>0?'เวลาตั้งสติ · วางสายและตรวจสอบกับช่องทางทางการ':'รายการยังพักไว้ แม้หมดเวลาแล้ว · ไม่มีการโอนต่ออัตโนมัติ';
  }
  if(model.screen===0)return 'กด “ฉันอาจถูกหลอก” บนหน้าจอมือถือ';
  if(model.screen===1)return model.protectionElapsed<PROTECTION_MS?'กำลังเปิดโหมดป้องกันบัญชี…':'หยุดเงินออกแล้ว · กด “เลือกรายการและแจ้งเหตุ”';
  return 'เคส SB-2026-00128 · เงินที่โอนไปก่อนหน้ายังอยู่ระหว่างตรวจสอบ';
}
function render(){
  syncScreen();draw();
  Object.assign($('phone').dataset,{scene:String(model.scene),screen:String(model.screen),mode:model.mode,playing:String(model.running),paused:String(model.paused),transition:String(Boolean(model.transition)),transitionElapsed:String(Math.round(model.transition?.elapsed||0)),countdown:String(model.countdown),holdElapsed:String(Math.round(model.holdElapsed)),protectionElapsed:String(Math.round(model.protectionElapsed)),step:String(model.mode==='auto'?model.timeline.step:-1),answers:JSON.stringify(model.questionAnswers)});
  const text=caption();if(text!==lastCaption){$('step-caption').textContent=text;lastCaption=text;}
  $('step-count').textContent=`หน้าจอ ${model.screen+1} / 3`;
  const label=model.running?'หยุด':model.paused?'เล่นต่อ':'เล่นอัตโนมัติ';
  $('play-label').textContent=label;$('play').setAttribute('aria-label',label);$('play-icon').textContent=model.running?'Ⅱ':'▶';
  $('back').disabled=model.screen===0;$('next').disabled=model.screen===2;
  const progress=model.mode==='auto'?model.timeline.progress:model.screen/2;
  $('progress-fill').style.transform=`scaleX(${progress})`;$('progress').setAttribute('aria-valuenow',String(Math.round(progress*100)));
}
function showSimulation(title,description){
  act(()=>{if(model.running)model.paused=true;});
  $('dialog-title').textContent=title;$('dialog-description').textContent=description;$('simulation-dialog').showModal();
}
function activate(hotspot,layer){
  if(!ready||model.transition||layer.key!==model.key)return;
  const id=hotspot.id;
  const answer=id.match(/^answer-(no-)?([123])$/);
  if(hotspot.dialog&&!answer){showSimulation(...hotspot.dialog);return;}
  act(()=>{
    if(id==='check-risk')model.checkRisk();
    else if(answer)model.answer(Number(answer[2])-1,!answer[1]);
    else if(id==='advice')model.advice();
    else if(id==='emergency'||id.startsWith('emergency-link'))model.emergency();
    else if(id==='report')model.report();
    else if(id==='phone-back')model.back();
    else if(id==='case-next')model.notice='ติดตามเคส เตรียมหลักฐาน และรอการตรวจสอบจากเจ้าหน้าที่';
    const[x,y,w,h]=hotspot.box;
    model.tap={x:x+w/2-layer.origin[0],y:y+h/2-layer.origin[1],elapsed:0};
  });
}
function playPause(){if(ready&&!$('simulation-dialog').open)act(()=>model.playPause());}
function toggleControls(){const hide=!$('controls').hidden;$('controls').hidden=hide;$('restore-bar').hidden=!hide;(hide?$('show-controls'):$('hide-controls')).focus({preventScroll:true});fitPhone();}
async function fullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else if($('presenter').requestFullscreen)await $('presenter').requestFullscreen();else showSimulation('แสดงเต็มจอ','ใช้โหมดแนวนอนและซ่อนแถบควบคุมเพื่อเพิ่มพื้นที่นำเสนอได้');}
  catch{showSimulation('แสดงเต็มจอ','เบราว์เซอร์ไม่อนุญาตให้เปิดเต็มจอในขณะนี้ คุณยังซ่อนแถบควบคุมได้');}
}
$('play').addEventListener('click',playPause);
$('next').addEventListener('click',()=>act(()=>model.next()));
$('back').addEventListener('click',()=>act(()=>model.back()));
$('reset').addEventListener('click',()=>act(()=>model.reset()));
$('scene-select').addEventListener('change',e=>act(()=>model.reset(Number(e.target.value))));
$('continuous').addEventListener('change',e=>{model.timeline.continuous=e.target.checked;});
$('zoom').addEventListener('change',e=>{zoom=e.target.value;fitPhone();$('viewport').scrollTo({top:0,left:0});});
$('fullscreen').addEventListener('click',fullscreen);
$('hide-controls').addEventListener('click',toggleControls);$('show-controls').addEventListener('click',toggleControls);
$('close-dialog').addEventListener('click',()=>$('simulation-dialog').close());
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'ออกจากเต็มจอ':'เต็มจอ');fitPhone();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&model.running)act(()=>{model.paused=true;});});
window.addEventListener('hashchange',()=>{const scene=location.hash==='#scene-2'?1:0;if(scene!==model.scene)act(()=>model.reset(scene));});
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||$('simulation-dialog').open||e.target.matches('select,input,textarea,[contenteditable="true"]'))return;
  const key=e.key.toLowerCase();if(key===' '&&e.target.matches('.hotspot'))return;
  if(key===' '){e.preventDefault();playPause();}
  else if(key==='arrowright'){e.preventDefault();act(()=>model.next());}
  else if(key==='arrowleft'){e.preventDefault();act(()=>model.back());}
  else if(key==='r')act(()=>model.reset());
  else if(key==='h')toggleControls();else if(key==='f')fullscreen();
});
model.reset(location.hash==='#scene-2'?1:0);render();fitPhone();$('play').disabled=true;
const assets=['phone/frame.png',...Array.from({length:2},(_,s)=>Array.from({length:3},(_,p)=>`phone/scene-${s+1}-screen-${p+1}.png`)).flat(),'phone/answer-no-atlas.png','phone/question-pending.png','countdown-atlas.png','answer-neutral-atlas.png','status-neutral-atlas.png'];
Promise.all(assets.map(name=>{const image=new Image();image.src=`./assets/${name}`;return image.decode();})).then(()=>document.fonts.ready).then(()=>{ready=true;$('play').disabled=false;$('phone').dataset.ready='true';}).catch(()=>{$('phone').dataset.ready='error';$('step-caption').textContent='โหลดภาพไม่ครบ กรุณารีเฟรชหน้าเว็บอีกครั้ง';});
