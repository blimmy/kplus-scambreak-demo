import { Journey, titles, sourceScreens, ease, TRANSITION_MS, PROTECTION_MS, REPORT_MS, money, walkthrough } from './journey.js?v=journey-v2';
import { content, caption, button } from './screens.js?v=journey-v2';
import { scenes } from './scenes.js';

const $=id=>document.getElementById(id), model=new Journey();
const WIDTH=440,HEIGHT=828;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let frame=null,lastTime=0,active=null,outgoing=null,zoom='1',ready=false,lastCaption='',lastCue=-2;

function fitPhone(){
  const style=getComputedStyle($('viewport'));
  const width=$('viewport').clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const height=$('viewport').clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const fit=Math.max(.01,Math.min(width/WIDTH,height/HEIGHT)),scale=zoom==='actual'?1:fit*Number(zoom);
  const snap=v=>Math.round(v*devicePixelRatio)/devicePixelRatio;
  Object.assign($('stage-holder').style,{width:`${WIDTH*scale}px`,height:`${HEIGHT*scale}px`,marginTop:`${snap(Math.max(0,(height-HEIGHT*scale)/2))}px`,marginLeft:`${snap(Math.max(0,(width-WIDTH*scale)/2))}px`,marginRight:'0'});
  $('phone').style.transform=`scale(${scale})`;$('phone').dataset.scale=scale.toFixed(7);
}
new ResizeObserver(fitPhone).observe($('viewport'));
function stopClock(){if(frame!==null)cancelAnimationFrame(frame);frame=null;lastTime=0;}
function startClock(){if(frame!==null||!model.running)return;lastTime=performance.now();frame=requestAnimationFrame(tick);}
function tick(now){frame=null;model.tick(now-lastTime);lastTime=now;render();if(model.running)frame=requestAnimationFrame(tick);}
function act(action){if(lastTime&&model.running)model.tick(performance.now()-lastTime);stopClock();action();render();startClock();}

function addButton(layer,id,label,box,action,value=''){
  const el=document.createElement('button');el.type='button';el.className='hotspot';
  Object.assign(el.dataset,{hotspot:id,action,value});el.setAttribute('aria-label',label);
  const[x,y,w,h]=box;Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
  layer.hotspots.append(el);return el;
}
function patch(layer,className,x,y,w,h,position=0){
  const el=document.createElement('div');el.className=`asset-patch ${className}`;
  Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,backgroundPosition:`0 ${position}px`});
  layer.patches.append(el);return el;
}
const mapping={
  'check-risk':['risk'],'advice':['advice'],'contact-bank':['contact'],'cancel-transfer':['cancel-request'],
  'emergency-link-0':['emergency'],'emergency-link-1':['emergency'],'emergency':['emergency'],
  'report':['report-start'],'contact-24':['contact'],'security':['go','security'],'case':['next-steps'],
  'status-received':['next-steps'],'status-investigation':['next-steps'],'status-aoc':['go','aoc'],
  'evidence-slip':['evidence-open','slip'],'evidence-chat':['evidence-open','chat'],'add-evidence':['add-evidence'],
  'contact-case':['contact'],'case-next':['next-steps'],
  'protection-1':['go','security'],'protection-2':['go','security'],'protection-3':['go','devices']
};
const homeButtons=[
  ['home-transfer','โอนเงิน',[25,292,94,101],'transfer'],
  ['home-topup','เติมเงินตัวอย่าง',[143,292,99,101],'service-start','topup'],
  ['home-bill','จ่ายบิลตัวอย่าง',[263,292,99,101],'service-start','bill'],
  ['home-withdraw','ถอนเงินตัวอย่าง',[25,397,97,102],'service-start','withdraw'],
  ['home-scan','สแกน QR ตัวอย่าง',[143,397,99,102],'go','scan'],
  ['home-services','บริการอื่น ๆ',[263,397,99,102],'go','services'],
  ['home-account','บัญชีของฉัน',[15,141,358,121],'go','account'],
  ['home-bell','แจ้งเตือน',[333,51,49,47],'go','notifications'],
  ['nav-home','หน้าแรก',[12,710,69,50],'home'],
  ['nav-transactions','ธุรกรรม',[103,710,69,50],'go','transactions'],
  ['nav-notifications','แจ้งเตือน',[192,710,71,50],'go','notifications'],
  ['nav-services','อื่น ๆ',[283,710,72,50],'go','services']
];
function buildLayer(route){
  const source=sourceScreens[route], layer={key:route,source,version:-1};
  layer.element=document.createElement('div');layer.element.className='screen-layer';layer.element.dataset.route=route;
  const image=new Image(388,778);image.className='screen-image';image.draggable=false;
  image.src=source?`./assets/phone/scene-${source[0]+1}-screen-${source[1]+1}.png`:'./assets/journey/page-shell.png';
  image.alt=source?titles[route]:'';layer.element.append(image);
  layer.patches=document.createElement('div');layer.patches.className='screen-patches';layer.patches.setAttribute('aria-hidden','true');layer.element.append(layer.patches);
  layer.hotspots=document.createElement('div');layer.hotspots.className='screen-hotspots';layer.element.append(layer.hotspots);
  layer.overlay=document.createElement('div');layer.overlay.className='journey-overlay';layer.element.append(layer.overlay);
  if(source){
    const[scene,screen]=source,ox=94+480*screen;
    for(const h of scenes[scene].hotspots){
      if(Math.floor(h.box[0]/480)!==screen)continue;
      const match=h.id.match(/^answer-(no-)?([123])$/);
      const action=match?['answer',`${Number(match[2])-1}:${!match[1]}`]:mapping[h.id];
      if(!action)continue;
      const label=match?`ข้อ ${match[2]} เลือก${match[1]?'ไม่ใช่':'ใช่'}`:h.label.replace(' — ไปฉากหยุดเงินทันเมื่อรู้ตัว','');
      addButton(layer,h.id,label,[h.box[0]-ox,h.box[1]-182,h.box[2],h.box[3]],...action);
    }
    if(route==='home')for(const args of homeButtons)addButton(layer,...args);
    else addButton(layer,'phone-back','ย้อนกลับหน้าก่อนหน้า',[8,43,38,36],'back');
    if(route==='questions'){
      layer.answers=[312,425,538].map((y,i)=>patch(layer,'answer-patch',27,y,156,35,-35*i));
      layer.noAnswers=[312,425,538].map((y,i)=>patch(layer,'answer-no-patch',27,y,334,35,-35*i));
      layer.review=patch(layer,'review-patch',14,607,360,90);
    }
    if(route==='hold')layer.timer=patch(layer,'timer-patch',132,300,124,52);
    if(route==='emergency')layer.statuses=[301,341,381].map((y,i)=>patch(layer,'status-patch',26,y,340,37,-37*i));
    if(route==='confirm'){
      layer.amount=document.createElement('div');layer.amount.className='dynamic-amount';layer.overlay.append(layer.amount);
      addButton(layer,'risk-new','ดูเหตุผลความเสี่ยง ผู้รับรายใหม่',[28,511,139,32],'go','riskInfo');
      addButton(layer,'risk-amount','ดูเหตุผลความเสี่ยง ยอดสูงกว่าปกติ',[183,511,158,32],'go','riskInfo');
    }
    if(route==='emergency')addButton(layer,'protected-balance','ดูยอดเงินขณะบัญชีอยู่ในโหมดป้องกัน',[15,444,358,50],'go','account');
    if(route==='tracking')addButton(layer,'reported-transaction','ดูรายละเอียดรายการที่แจ้ง',[15,202,358,104],'transaction','prior');
    if(route==='home'){
      layer.balance=document.createElement('div');layer.balance.className='home-balance';layer.overlay.append(layer.balance);
      layer.case=document.createElement('div');layer.case.className='home-case';layer.overlay.append(layer.case);
    }
    if(route==='tracking'){layer.evidence=document.createElement('div');layer.evidence.className='tracking-evidence';layer.overlay.append(layer.evidence);}
  }else{
    const heading=document.createElement('h1');heading.className='custom-heading';heading.textContent=titles[route];layer.element.append(heading);
    layer.body=document.createElement('div');layer.body.className='custom-content';layer.element.append(layer.body);
    addButton(layer,'phone-back','ย้อนกลับหน้าก่อนหน้า',[8,43,38,36],'back');
    const home=document.createElement('button');home.type='button';home.className='page-home';home.dataset.action='home';home.setAttribute('aria-label','กลับหน้าแรก');
    home.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3 21 11M6 9v12h12V9M10 21v-7h4v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    layer.element.append(home);
  }
  layer.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.svg.classList.add('screen-motion');layer.svg.setAttribute('viewBox','0 0 388 778');layer.svg.setAttribute('aria-hidden','true');
  layer.svg.innerHTML='<rect class="guide-highlight" rx="11" fill="none" stroke="#08aa8f" stroke-width="2.2"/><circle class="countdown-progress" cx="194" cy="340" r="62" fill="none" stroke="#08aa8f" stroke-width="4" transform="rotate(-90 194 340)"/><g class="demo-cursor"><path d="M0 0 L4 29 L11 22 L17 34 L23 31 L17 19 L27 18 Z" fill="#fff" stroke="#163d43" stroke-width="2" stroke-linejoin="round"/></g>';
  layer.element.append(layer.svg);
  layer.element.addEventListener('click',event=>{
    const target=event.target.closest('button[data-action]');
    if(!target||!ready||model.transition||layer.key!==model.route)return;
    const box=target.getBoundingClientRect(),screen=$('screen-window').getBoundingClientRect(),scale=screen.width/388;
    const x=(box.x+box.width/2-screen.x)/scale,y=(box.y+box.height/2-screen.y)/scale;
    act(()=>{model.dispatch(target.dataset.action,target.dataset.value??null);model.tap={x,y,elapsed:0};});
  });
  layer.element.addEventListener('input',event=>{
    if(event.target.id!=='amount-input')return;
    act(()=>{model.takeControl();model.setAmount(event.target.value);});
  });
  layer.element.addEventListener('keydown',event=>{
    if(event.target.id==='amount-input'&&event.key==='Enter'){event.preventDefault();act(()=>model.dispatch('amount-next'));}
  });
  return layer;
}
function updateContent(layer){
  if(!layer.body||layer.version===model.revision)return;
  if(model.route==='amount'&&layer.version>=0){
    const input=layer.body.querySelector('#amount-input');
    if(input.value!==model.amountRaw)input.value=model.amountRaw;
    const error=layer.body.querySelector('#amount-error');error.textContent=model.notice;error.hidden=!model.notice;
  }else{
    const focus=document.activeElement,action=focus?.dataset.action,value=focus?.dataset.value,scroll=layer.body.scrollTop;
    layer.body.innerHTML=content(model);layer.body.scrollTop=scroll;
    if(action){const replacement=[...layer.body.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===action&&b.dataset.value===value);replacement?.focus({preventScroll:true});}
  }
  layer.version=model.revision;
}
function syncScreen(){
  if(!active||active.key!==model.key){
    if(outgoing){outgoing.element.remove();outgoing=null;}
    if(active){
      if(model.transition?.from===active.key){outgoing=active;outgoing.element.inert=true;outgoing.element.setAttribute('aria-hidden','true');outgoing.element.style.opacity='1';}
      else active.element.remove();
    }
    active=buildLayer(model.route);$('screen-layers').append(active.element);
    $('phone').setAttribute('aria-label',`มือถือจำลอง · ${titles[model.route]}`);
    $('phone-description').textContent=`หน้า ${titles[model.route]} ของเดโม K PLUS ScamBreak ข้อมูลสมมติ กดปุ่มบนหน้าจอเพื่อเดินเรื่อง`;
    history.replaceState(null,'',`${location.pathname}${location.search}#${model.route}`);
  }
  if(!model.transition&&outgoing){outgoing.element.remove();outgoing=null;}
  active.element.style.opacity=model.transition&&!reducedMotion.matches?String(ease(model.transition.elapsed/TRANSITION_MS)):'1';
  active.element.inert=Boolean(model.transition);
  updateContent(active);
}
function draw(){
  const layer=active;
  let guidedTap=null;
  for(const el of layer.svg.children)el.style.visibility='hidden';
  if(layer.answers){
    layer.answers.forEach((el,i)=>el.style.opacity=model.answers[i]===true?'0':'1');
    layer.noAnswers.forEach((el,i)=>el.style.display=model.answers[i]===false?'block':'none');
    layer.review.style.opacity=model.answers.some(v=>v===null)||!model.answers.includes(true)?'1':String(1-ease(model.reviewElapsed/450));
    for(const el of layer.hotspots.querySelectorAll('[data-action="answer"]')){const[i,v]=el.dataset.value.split(':');el.setAttribute('aria-pressed',String(model.answers[Number(i)]===(v==='true')));}
    layer.hotspots.querySelector('[data-action="advice"]').setAttribute('aria-disabled',String(model.answers.some(v=>v===null)));
  }
  if(layer.statuses){
    layer.statuses.forEach((el,i)=>el.style.opacity=String(1-ease((model.protectionElapsed-(300+i*700))/450)));
    layer.hotspots.querySelector('[data-action="report-start"]').setAttribute('aria-disabled',String(!model.statusReady));
  }
  if(layer.timer){
    layer.timer.style.display=model.countdown===45?'none':'block';layer.timer.style.backgroundPosition=`0 -${(45-model.countdown)*52}px`;
    const ring=layer.svg.querySelector('.countdown-progress'),total=2*Math.PI*62;
    ring.setAttribute('stroke-dasharray',total);ring.setAttribute('stroke-dashoffset',total*(1-model.countdown/45));ring.setAttribute('opacity','.6');
    ring.style.visibility=model.countdown>0&&model.countdown<45?'visible':'hidden';
  }
  if(layer.amount){layer.amount.textContent=money(model.amountCents)+' บาท';layer.amount.hidden=model.amountCents===5000000;}
  if(layer.balance){layer.balance.hidden=!model.balanceVisible;layer.balance.textContent=money(model.balanceCents)+' บาท';}
  if(layer.case){
    layer.case.hidden=!model.caseSubmitted;
    if(model.caseSubmitted&&!layer.case.children.length)layer.case.innerHTML='<img src="./assets/journey/help-shield.png" alt=""><strong>รับแจ้งเหตุแล้ว</strong><p>SB-2026-00128 · กำลังตรวจสอบ</p>'+button('ติดตามเรื่องที่แจ้งไว้','track')+'<small>บัญชีของคุณยังอยู่ในโหมดป้องกัน</small>';
  }
  if(layer.evidence){
    const original=model.evidenceSet.size===2&&model.evidenceSet.has('slip')&&model.evidenceSet.has('chat');
    layer.evidence.hidden=original;
    for(const id of ['evidence-slip','evidence-chat','add-evidence'])layer.hotspots.querySelector(`[data-hotspot="${id}"]`).hidden=!original;
    const signature=[...model.evidenceSet].join(',');
    if(!original&&layer.evidenceSignature!==signature){layer.evidence.innerHTML=`<strong>หลักฐานในเคส · ${model.evidenceSet.size} รายการ</strong><div>${button('ดูหลักฐานทั้งหมด','go','evidence','secondary')}${button('+ เพิ่มหลักฐาน','add-evidence','','secondary')}</div>`;layer.evidenceSignature=signature;}
  }
  if(model.route==='submitting'){
    const progress=layer.body.querySelector('#report-progress');progress.style.transform=`scaleX(${model.reportElapsed/REPORT_MS})`;
    progress.parentElement.setAttribute('aria-valuenow',Math.round(model.reportElapsed/REPORT_MS*100));
  }
  if(model.route==='call'){
    layer.body.querySelector('#call-state').textContent=model.callElapsed<2200?'กำลังเชื่อมต่อจำลอง…':'เชื่อมต่อกับเจ้าหน้าที่จำลองแล้ว';
    layer.body.querySelector('#call-progress').style.transform=`scaleX(${model.callElapsed/2200})`;
  }
  if(model.cue?.focus&&!model.autoApplied){
    const cue=model.cue;
    const target=[...layer.element.querySelectorAll('button[data-action]')].find(el=>el.dataset.focus===cue.focus||el.dataset.hotspot===cue.focus||(el.dataset.action===cue.action&&(cue.value===null||el.dataset.value===String(cue.value))));
    if(target){
      if(lastCue!==model.autoIndex&&layer.body?.contains(target))target.scrollIntoView({block:'nearest',inline:'nearest'});
      lastCue=model.autoIndex;
      const box=target.getBoundingClientRect(),screen=$('screen-window').getBoundingClientRect(),scale=screen.width/388;
      const x=(box.x-screen.x)/scale,y=(box.y-screen.y)/scale,w=box.width/scale,h=box.height/scale;
      const rect=layer.svg.querySelector('.guide-highlight');
      for(const[k,v]of Object.entries({x:x-1,y:y-1,width:w+2,height:h+2,opacity:reducedMotion.matches?1:ease(model.autoElapsed/600)}))rect.setAttribute(k,String(v));
      rect.style.visibility='visible';
      if(model.autoElapsed>=cue.duration-1100)guidedTap={x:x+w/2,y:y+h/2,elapsed:model.autoElapsed-(cue.duration-1100)};
      if(!reducedMotion.matches){const cursor=layer.svg.querySelector('.demo-cursor'),p=ease((model.autoElapsed-250)/1100);cursor.setAttribute('transform',`translate(${x+w/2+45*(1-p)} ${y+h/2-55*(1-p)})`);cursor.setAttribute('opacity',String(ease(model.autoElapsed/300)));cursor.style.visibility='visible';}
    }
  }
  const tap=$('tap-ripple'),effect=model.tap??guidedTap;tap.style.visibility=effect?'visible':'hidden';
  if(effect){const t=effect.elapsed/650;tap.setAttribute('cx',effect.x);tap.setAttribute('cy',effect.y);tap.setAttribute('r',6+25*ease(t));tap.setAttribute('opacity',1-t);}
}
function render(){
  syncScreen();draw();
  Object.assign($('phone').dataset,{route:model.route,scene:String(model.scene),screen:String(model.screen),mode:model.mode,playing:String(model.running),paused:String(model.paused),transition:String(Boolean(model.transition)),transitionElapsed:String(Math.round(model.transition?.elapsed??0)),countdown:String(model.countdown),holdElapsed:String(Math.round(model.holdElapsed)),protectionElapsed:String(Math.round(model.protectionElapsed)),reportElapsed:String(Math.round(model.reportElapsed)),answers:JSON.stringify(model.answers),amount:String(model.amountCents),transferStatus:model.transferStatus,protected:String(model.accountProtected),caseSubmitted:String(model.caseSubmitted),evidence:String(model.evidenceSet.size),step:String(model.autoIndex)});
  const text=caption(model);if(text!==lastCaption){$('step-caption').textContent=text;lastCaption=text;}
  $('step-count').textContent=model.cue?`สาธิต ${model.autoIndex+1}/${walkthrough.length}`:'เดโมเดียว';
  const label=model.running?'หยุด':model.paused?'เล่นต่อ':'สาธิตครบ';
  $('play-label').textContent=label;$('play-icon').textContent=model.running?'Ⅱ':'▶';$('play').setAttribute('aria-label',label);
  $('back').disabled=!model.canBack;$('next').disabled=model.route==='submitting';
  $('next').title=model.primaryAction?'ดำเนินขั้นตอนถัดไป (→)':'กลับหน้าแรก (→)';
  const progress=model.cue?(model.autoIndex+Math.min(1,model.autoElapsed/model.cue.duration))/walkthrough.length:model.caseSubmitted?1:model.accountProtected?.6:model.transferStatus==='held'?.4:0;
  $('progress-fill').style.transform=`scaleX(${progress})`;$('progress').setAttribute('aria-valuenow',Math.round(progress*100));
}
function playPause(){if(ready&&!$('simulation-dialog').open)act(()=>model.playPause());}
function toggleControls(){const hide=!$('controls').hidden;$('controls').hidden=hide;$('restore-bar').hidden=!hide;(hide?$('show-controls'):$('hide-controls')).focus({preventScroll:true});fitPhone();}
function presentationNotice(text){act(()=>{if(model.running)model.paused=true;});$('dialog-title').textContent='การนำเสนอ';$('dialog-description').textContent=text;$('simulation-dialog').showModal();}
async function fullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else if($('presenter').requestFullscreen)await $('presenter').requestFullscreen();else presentationNotice('ใช้โหมดแนวนอนและซ่อนแถบควบคุมเพื่อเพิ่มพื้นที่นำเสนอได้');}
  catch{presentationNotice('เบราว์เซอร์ไม่อนุญาตเต็มจอในขณะนี้ คุณยังซ่อนแถบควบคุมได้');}
}
$('play').addEventListener('click',playPause);
$('next').addEventListener('click',()=>act(()=>model.next()));
$('back').addEventListener('click',()=>act(()=>model.dispatch('back')));
$('reset').addEventListener('click',()=>act(()=>{model.reset();lastCue=-2;$('scene-select').value='jump';}));
$('scene-select').addEventListener('change',e=>act(()=>{
  const value=e.target.value;
  if(value==='transfer')model.dispatch('transfer');
  else if(value==='emergency')model.dispatch('emergency');
  else if(value==='tracking')model.dispatch('track');
  else model.dispatch('home');
  e.target.value='jump';
}));
$('continuous').addEventListener('change',e=>{model.continuous=e.target.checked;});
$('zoom').addEventListener('change',e=>{zoom=e.target.value;fitPhone();$('viewport').scrollTo({top:0,left:0});});
$('fullscreen').addEventListener('click',fullscreen);
$('hide-controls').addEventListener('click',toggleControls);$('show-controls').addEventListener('click',toggleControls);
$('close-dialog').addEventListener('click',()=>$('simulation-dialog').close());
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'ออกจากเต็มจอ':'เต็มจอ');fitPhone();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&model.running)act(()=>{model.paused=true;});});
window.addEventListener('hashchange',()=>{if(location.hash==='#home')act(()=>model.dispatch('home'));});
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||$('simulation-dialog').open||e.target.matches('select,input,textarea,[contenteditable="true"]'))return;
  const key=e.key.toLowerCase();if(key===' '&&e.target.closest('#phone button'))return;
  if(key===' '){e.preventDefault();playPause();}
  else if(key==='arrowright'){e.preventDefault();act(()=>model.next());}
  else if(key==='arrowleft'){e.preventDefault();act(()=>model.dispatch('back'));}
  else if(key==='r')act(()=>model.reset());
  else if(key==='h')toggleControls();else if(key==='f')fullscreen();
});
render();fitPhone();$('play').disabled=true;
const assets=['phone/frame.png',...Array.from({length:2},(_,s)=>Array.from({length:3},(_,p)=>`phone/scene-${s+1}-screen-${p+1}.png`)).flat(),'phone/answer-no-atlas.png','phone/question-pending.png','countdown-atlas.png','answer-neutral-atlas.png','status-neutral-atlas.png','journey/page-shell.png','journey/recipient.png','journey/help-shield.png'];
Promise.all(assets.map(name=>{const image=new Image();image.src=`./assets/${name}`;return image.decode();})).then(()=>document.fonts.ready).then(()=>{ready=true;$('play').disabled=false;$('phone').dataset.ready='true';}).catch(()=>{$('phone').dataset.ready='error';$('step-caption').textContent='โหลดภาพไม่ครบ กรุณารีเฟรชหน้าเว็บอีกครั้ง';});
