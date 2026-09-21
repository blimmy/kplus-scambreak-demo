import test from 'node:test';
import assert from 'node:assert/strict';
import { Journey, parseAmount, money, walkthrough, COUNTDOWN_MS, PROTECTION_MS, TRANSITION_MS, REPORT_MS } from '../src/journey.js';
const settle=m=>m.tick(TRANSITION_MS+1);
function held(amount='50000'){
  const m=new Journey();m.dispatch('transfer');m.dispatch('recipient-select');m.setAmount(amount);m.dispatch('amount-next');m.dispatch('risk');
  for(let i=0;i<3;i++)m.dispatch('answer',`${i}:true`);
  m.dispatch('advice');settle(m);return m;
}
function ready(m=new Journey()){m.dispatch('emergency');m.tick(PROTECTION_MS+TRANSITION_MS);m.dispatch('report-start');m.dispatch('select-prior');m.dispatch('report-details');m.dispatch('reason','phone');m.dispatch('consent');m.dispatch('report-review');return m;}
function submitted(m=ready()){m.dispatch('report-send');m.tick(REPORT_MS);settle(m);return m;}

test('one integrated demo begins at home with a separate prior payment and no case',()=>{
  const m=new Journey();m.tick(60000);assert.equal(m.route,'home');assert.equal(m.caseSubmitted,false);assert.equal(m.amountCents,0);assert.equal(m.accountProtected,false);assert.equal(m.running,false);
});
test('amount parsing uses exact cents and rejects negative, empty, exponential and excess decimals',()=>{
  for(const bad of ['',0,'0.00','-1','abc','1e5','NaN','12.345','99999999'])assert.equal(parseAmount(bad),null);
  assert.equal(parseAmount('12,345.67'),1234567);assert.equal(parseAmount('.5'),null);assert.equal(parseAmount('0.01'),1);assert.equal(money(1234567),'12,345.67');
});
test('number pad, decimal, backspace, clear and presets change the real amount field',()=>{
  const m=new Journey();for(const key of ['1','2','.','3','4','5'])m.dispatch('amount-key',key);
  assert.equal(m.amountRaw,'12.34');m.dispatch('amount-key','backspace');assert.equal(m.amountRaw,'12.3');m.dispatch('amount-key','clear');assert.equal(m.amountRaw,'');
  m.dispatch('amount-preset','50000');assert.equal(m.amountRaw,'50000');
});
test('confirm requires a valid affordable amount and uses the entered value',()=>{
  const m=new Journey();m.dispatch('transfer');m.dispatch('recipient-select');m.dispatch('amount-next');assert.equal(m.route,'amount');assert.ok(m.notice);
  m.setAmount('999999');m.dispatch('amount-next');assert.equal(m.route,'amount');m.setAmount('12345.67');m.dispatch('amount-next');assert.equal(m.route,'confirm');assert.equal(m.amountCents,1234567);
});
test('questions require all answers and allow both yes and no',()=>{
  const m=new Journey();m.route='questions';m.dispatch('advice');assert.equal(m.route,'questions');
  m.dispatch('answer','0:true');m.dispatch('answer','1:false');m.dispatch('answer','2:false');m.dispatch('advice');assert.equal(m.route,'hold');assert.deepEqual(m.answers,[true,false,false]);
});
test('a held transaction is never sent or deducted, including at zero countdown',()=>{
  const m=held('12345.67'),balance=m.balanceCents;m.tick(COUNTDOWN_MS+5000);assert.equal(m.countdown,0);assert.equal(m.route,'hold');assert.equal(m.transferStatus,'held');assert.equal(m.balanceCents,balance);assert.equal(m.amountCents,1234567);
});
test('starting another transfer or QR cannot silently overwrite a held transfer',()=>{
  const m=held('12345.67');m.dispatch('home');m.dispatch('transfer');assert.equal(m.route,'hold');assert.equal(m.amountCents,1234567);assert.equal(m.transferStatus,'held');m.dispatch('home');m.dispatch('scan-sample');assert.equal(m.route,'hold');assert.equal(m.amountCents,1234567);
});
test('cancel has a confirmation, supports Back and affects only the pending transaction',()=>{
  const m=held(),balance=m.balanceCents;m.dispatch('cancel-request');assert.equal(m.route,'cancel');m.dispatch('back');assert.equal(m.route,'hold');m.dispatch('cancel-request');m.dispatch('cancel-yes');
  assert.equal(m.route,'cancelled');assert.equal(m.transferStatus,'cancelled');assert.equal(m.balanceCents,balance);m.dispatch('back');assert.equal(m.route,'home');
});
test('both features are connected in one state without a scene reset',()=>{
  const m=held('12345.67');ready(m);assert.equal(m.route,'review');assert.equal(m.amountCents,1234567);assert.equal(m.transferStatus,'held');assert.equal(m.accountProtected,true);assert.equal(m.selectedTxn,true);
  submitted(m);assert.equal(m.route,'tracking');assert.equal(m.caseSubmitted,true);assert.equal(m.amountCents,1234567);assert.equal(m.balanceCents,12345678);
});
test('emergency completes protection rows before report selection and marks other devices ended',()=>{
  const m=new Journey();m.dispatch('emergency');m.dispatch('report-start');assert.equal(m.route,'emergency');m.tick(PROTECTION_MS+TRANSITION_MS);assert.equal(m.otherDevicesEnded,true);m.dispatch('report-start');assert.equal(m.route,'select');
});
test('report selection, incident and consent all gate submission',()=>{
  const m=new Journey();m.route='select';m.dispatch('report-details');assert.equal(m.route,'select');m.dispatch('select-prior');m.dispatch('report-details');m.dispatch('report-review');assert.equal(m.route,'details');
  m.dispatch('reason','phone');m.dispatch('report-review');assert.equal(m.route,'details');m.dispatch('consent','');assert.equal(m.consent,true);m.dispatch('report-review');assert.equal(m.route,'review');
});
test('Back during simulated submission cancels its timer and cannot create a phantom case',()=>{
  const m=ready();m.dispatch('report-send');m.tick(600);m.dispatch('back');m.tick(999999);assert.equal(m.caseSubmitted,false);assert.equal(m.reportStatus,'idle');assert.equal(m.route,'review');
});
test('submission is idempotent and completed-case Back skips obsolete forms',()=>{
  const m=submitted();m.dispatch('report-send');assert.equal(m.route,'tracking');m.dispatch('back');assert.notEqual(m.route,'review');assert.notEqual(m.route,'select');assert.equal(m.caseSubmitted,true);
});
test('pause freezes all clocks, fades and ripples and resumes at the same point',()=>{
  const m=held();m.dispatch('emergency');m.tap={x:5,y:7,elapsed:0};m.tick(120);m.playPause();const before=JSON.stringify(m);m.tick(30000);assert.equal(JSON.stringify(m),before);m.playPause();m.tick(100);assert.equal(m.transition.elapsed,220);assert.equal(m.tap.elapsed,220);
});
test('protection persists across home, Back, transfer, QR and other money-out services',()=>{
  const m=held();m.dispatch('emergency');m.tick(3000);m.dispatch('home');assert.equal(m.accountProtected,true);
  for(const [action,value]of [['transfer'],['scan-sample'],['service-start','topup'],['service-start','bill'],['service-start','withdraw']]){m.dispatch(action,value);assert.equal(m.route,'blocked');m.dispatch('home');}
  m.go('confirm');assert.equal(m.route,'blocked');m.dispatch('back');assert.equal(m.route,'home');
});
test('evidence can be selected, added, viewed and revised without accepting actual files',()=>{
  const m=submitted();m.dispatch('add-evidence');m.dispatch('evidence-toggle','call');m.dispatch('evidence-save');assert.equal(m.evidenceSet.size,3);assert.equal(m.route,'tracking');
  m.dispatch('evidence-open','call');assert.equal(m.route,'viewer');assert.equal(m.viewer,'call');m.dispatch('back');assert.equal(m.route,'tracking');
  m.dispatch('add-evidence');for(const key of [...m.evidenceDraft])m.dispatch('evidence-toggle',key);m.dispatch('evidence-save');assert.equal(m.route,'addEvidence');assert.ok(m.notice);
});
test('contact chat choices and call connection have actual in-memory states',()=>{
  const m=new Journey();m.dispatch('contact');m.dispatch('chat');m.dispatch('chat-choice','hold');assert.equal(m.contactChoice,'hold');m.dispatch('back');assert.equal(m.route,'contact');m.dispatch('call');m.tick(1000);m.playPause();m.tick(5000);assert.equal(m.callElapsed,1000);m.playPause();m.tick(1500);assert.equal(m.callElapsed,2200);m.dispatch('end-call');assert.equal(m.callActive,false);assert.equal(m.route,'contact');
});
test('security, evidence preparation and notifications remain available in one app',()=>{
  const m=submitted();m.dispatch('go','devices');m.dispatch('devices-end');assert.equal(m.otherDevicesEnded,true);m.dispatch('password-check');assert.equal(m.passwordChecked,true);m.dispatch('go','aoc');m.dispatch('aoc-ready');assert.equal(m.aocPrepared,true);m.dispatch('go','notifications');assert.equal(m.readNotifications,true);assert.equal(m.caseSubmitted,true);
});
test('peripheral demo services create one receipt and only change the mock balance',()=>{
  for(const kind of ['topup','bill','withdraw']){const m=new Journey(),balance=m.balanceCents;m.dispatch('service-start',kind);m.dispatch('service-next');m.dispatch('service-confirm');const changed=m.balanceCents;assert.ok(changed<balance);assert.equal(m.serviceReceipts.length,1);m.dispatch('service-confirm');assert.equal(m.balanceCents,changed);assert.equal(m.serviceReceipts.length,1);}
});
test('reset clears form, case, evidence, protection and every pending effect',()=>{
  const m=submitted();m.dispatch('add-evidence');m.dispatch('evidence-toggle','call');m.dispatch('evidence-save');m.reset();m.tick(999999);assert.equal(m.route,'home');assert.equal(m.accountProtected,false);assert.equal(m.caseSubmitted,false);assert.equal(m.amountRaw,'');assert.equal(m.evidenceSet.size,2);assert.equal(m.running,false);assert.equal(m.transition,null);
});
test('automatic walkthrough actually executes the unified workflow through case and evidence',()=>{
  const m=new Journey();m.startAuto();const visited=new Set();for(let i=0;i<2000&&m.mode==='auto';i++){visited.add(m.autoIndex);m.tick(100);}
  assert.equal(visited.size,walkthrough.length);assert.equal(m.route,'home');assert.equal(m.caseSubmitted,true);assert.equal(m.accountProtected,true);assert.equal(m.evidenceSet.size,3);assert.equal(m.amountCents,5000000);assert.equal(m.mode,'manual');
});
test('non-continuous auto pauses after each applied action; a user tap takes over',()=>{
  const m=new Journey();m.continuous=false;m.startAuto();for(let i=0;i<60&&!m.paused;i++)m.tick(100);assert.equal(m.route,'recipient');assert.equal(m.autoIndex,1);assert.equal(m.paused,true);m.playPause();assert.equal(m.autoPlaying,true);m.dispatch('recipient-select');assert.equal(m.route,'amount');assert.equal(m.mode,'manual');assert.equal(m.autoPlaying,false);
});
