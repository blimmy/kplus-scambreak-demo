export const TRANSITION_MS=380, COUNTDOWN_MS=15000, PROTECTION_MS=2400, REPORT_MS=1800;
export const clamp=v=>Math.max(0,Math.min(1,v));
export const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
export const money=cents=>(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export function parseAmount(raw){
  const value=String(raw).trim().replaceAll(',','');
  if(!/^\d{1,7}(\.\d{0,2})?$/.test(value))return null;
  const [whole,fraction='']=value.split('.');
  const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(cents)&&cents>0?cents:null;
}
export const titles={home:'หน้าแรก',recipient:'เลือกผู้รับ',amount:'ระบุจำนวนเงิน',confirm:'ตรวจสอบข้อมูล',questions:'เบรกก่อนโอน',hold:'พักรายการโอน',cancel:'ยกเลิกรายการ',cancelled:'ยกเลิกรายการแล้ว',emergency:'โหมดฉุกเฉิน',transactions:'ธุรกรรมของฉัน',transaction:'รายละเอียดรายการ',select:'เลือกรายการแจ้งเหตุ',details:'รายละเอียดเหตุการณ์',review:'ตรวจสอบการแจ้งเหตุ',submitting:'กำลังรับแจ้งเหตุ',tracking:'ติดตามเรื่อง',evidence:'หลักฐานในเคส',addEvidence:'เพิ่มหลักฐาน',viewer:'หลักฐานตัวอย่าง',contact:'ติดต่อเจ้าหน้าที่',chat:'สนทนากับเจ้าหน้าที่',call:'ติดต่อผ่านแอป',security:'ความปลอดภัย',devices:'อุปกรณ์ที่เข้าสู่ระบบ',password:'ตรวจความปลอดภัย',nextSteps:'ขั้นตอนที่ต้องทำต่อ',aoc:'เตรียมข้อมูลแจ้ง AOC',account:'บัญชีของฉัน',notifications:'แจ้งเตือน',services:'บริการอื่น ๆ',service:'รายการตัวอย่าง',serviceReview:'ตรวจสอบรายการ',serviceDone:'ผลรายการตัวอย่าง',scan:'สแกน QR',blocked:'บัญชีอยู่ในโหมดป้องกัน'};
export const sourceScreens={home:[1,0],confirm:[0,0],questions:[0,1],hold:[0,2],emergency:[1,1],tracking:[1,2]};
titles.riskInfo='เหตุผลที่รายการถูกเตือน';
export const evidenceNames={slip:'สลิปโอนเงิน',chat:'ภาพแชต',call:'บันทึกการโทรตัวอย่าง',profile:'โปรไฟล์ผู้ติดต่อตัวอย่าง'};
export const reasons={phone:'มีผู้โทรมาเร่งให้โอนเงิน',official:'แอบอ้างเป็นเจ้าหน้าที่',purchase:'ซื้อสินค้าแล้วไม่ได้รับของ'};
export const services={topup:{title:'เติมเงิน',recipient:'หมายเลขตัวอย่าง xxx-xxx-0000',amounts:[20,50,100]},bill:{title:'จ่ายบิล',recipient:'บิลค่าสาธารณูปโภคตัวอย่าง',amounts:[250,500,1000]},withdraw:{title:'ถอนเงิน',recipient:'รายการถอนเงินตัวอย่าง',amounts:[200,500,1000]}};

const cue=(caption,action,value,duration=4200,focus=action)=>({caption,action,value,duration,focus});
export const walkthrough=[
  cue('เริ่มจากหน้าแรก กดโอนเงิน','transfer',null,4500),
  cue('เลือกผู้รับตัวอย่างจากรายการ','recipient-select',null,4000),
  cue('ระบุยอดโอนตัวอย่าง 50,000 บาท','amount-preset','50000',3500),
  cue('ตรวจสอบยอดแล้วไปต่อ','amount-next',null,4200),
  cue('พบผู้รับรายใหม่และยอดสูงกว่าปกติ ตรวจสอบความเสี่ยงก่อน','risk',null,6500),
  cue('มีผู้โทรมาเร่งให้โอนเงิน เลือกใช่','answer','0:true',4000,'answer-1'),
  cue('แอบอ้างเป็นเจ้าหน้าที่ เลือกใช่','answer','1:true',4000,'answer-2'),
  cue('ห้ามวางสายหรือบอกผู้อื่น เลือกใช่','answer','2:true',4000,'answer-3'),
  cue('อ่านสัญญาณเสี่ยง แล้วดูคำแนะนำ','advice',null,4500),
  cue('พักรายการเพื่อให้ตั้งสติ เงินยังไม่ออก และไม่โอนต่อเมื่อหมดเวลา',null,null,16800,null),
  cue('นึกได้ว่าเคยโอนไปก่อนหน้า กดฉันอาจถูกหลอก','emergency',null,4500),
  cue('หยุดเงินออกจากบัญชี จากนั้นเลือกรายการที่เคยโอนไปแจ้งเหตุ','report-start',null,6500),
  cue('เลือกรายการก่อนหน้า 50,000 บาท ไม่ใช่รายการที่กำลังพัก','select-prior',null,4500),
  cue('ไปกรอกรายละเอียดเหตุการณ์','report-details',null,4000),
  cue('ระบุประเภทเหตุการณ์จากตัวเลือกตัวอย่าง','reason','phone',4000,'reason-phone'),
  cue('ตรวจสอบข้อมูลและยืนยันความยินยอมในเดโม','consent','true',4000),
  cue('ทบทวนรายการ เหตุการณ์ และหลักฐาน','report-review',null,4500),
  cue('ยืนยันแจ้งเหตุจำลอง ไม่มีการส่งข้อมูลจริง','report-send',null,4500),
  cue('รับแจ้งเหตุแล้ว เงินที่โอนไปก่อนหน้ายังอยู่ระหว่างตรวจสอบ',null,null,6000,null),
  cue('เพิ่มหลักฐานให้เคสจากตัวอย่างในเครื่อง','add-evidence',null,4500),
  cue('เลือกบันทึกการโทรตัวอย่าง','evidence-toggle','call',3800,'evidence-call'),
  cue('บันทึกหลักฐานไว้ในเคสจำลอง','evidence-save',null,4200),
  cue('ดูสิ่งที่ควรทำต่อและสถานะเคส','next-steps',null,5500),
  cue('กลับหน้าแรก บัญชียังถูกป้องกันและเปิดติดตามเคสต่อได้','home',null,5500)
];

/** A single in-memory app. Held transfer, prior payment and case are separate records. */
export class Journey{
  constructor(){this.continuous=true;this.reset();}
  reset(){
    Object.assign(this,{route:'home',stack:[],revision:0,transition:null,tap:null,paused:false,notice:'',noticeMs:0,
      mode:'manual',autoIndex:-1,autoElapsed:0,autoApplied:false,autoPlaying:false,
      amountRaw:'',amountCents:0,transferStatus:'idle',answers:[null,null,null],holdElapsed:0,reviewElapsed:0,
      accountProtected:false,protectionElapsed:0,balanceCents:12345678,balanceVisible:false,otherDevicesEnded:false,passwordChecked:false,
      selectedTxn:false,reason:'',consent:false,reportStatus:'idle',reportElapsed:0,caseSubmitted:false,
      evidenceSet:new Set(['slip','chat']),evidenceDraft:new Set(),viewer:'slip',aocPrepared:false,readNotifications:false,
      contactChoice:'',callElapsed:0,callActive:false,serviceKind:'topup',serviceAmount:2000,serviceReceipts:[],transactionId:'prior'});
  }
  get key(){return this.route;}
  get screen(){return sourceScreens[this.route]?.[1]??-1;}
  get scene(){return sourceScreens[this.route]?.[0]??-1;}
  get countdown(){return Math.max(0,45-Math.floor(this.holdElapsed/COUNTDOWN_MS*45));}
  get cue(){return this.mode==='auto'?walkthrough[this.autoIndex]??null:null;}
  get hasPending(){return Boolean(this.transition||this.tap||this.noticeMs>0||this.autoPlaying||
    (this.transferStatus==='held'&&this.holdElapsed<COUNTDOWN_MS)||
    (this.accountProtected&&this.protectionElapsed<PROTECTION_MS)||this.reportStatus==='sending'||
    (this.route==='questions'&&this.answers.every(v=>v!==null)&&this.reviewElapsed<450)||
    (this.callActive&&this.callElapsed<2200));}
  get running(){return !this.paused&&this.hasPending;}
  get statusReady(){return this.accountProtected&&this.protectionElapsed>=PROTECTION_MS;}
  get canBack(){return this.stack.length>0||this.route!=='home';}
  get primaryAction(){return {home:'transfer',recipient:'recipient-select',amount:'amount-next',confirm:'risk',questions:'advice',hold:'emergency',emergency:'report-start',select:'report-details',details:'report-review',review:'report-send',tracking:'next-steps',cancel:'cancel-yes',cancelled:'home',addEvidence:'evidence-save',service:'service-next',serviceReview:'service-confirm',serviceDone:'home',blocked:'contact',scan:'scan-sample',aoc:'aoc-ready'}[this.route]??null;}
  notify(text){this.notice=text;this.noticeMs=4500;this.revision++;}
  touch(){this.revision++;}
  go(route,{replace=false}={}){
    if(!titles[route])return;
    if(this.accountProtected&&['recipient','amount','confirm','questions','service','serviceReview'].includes(route))route='blocked';
    if(route==='tracking'&&!this.caseSubmitted){route=this.accountProtected?'select':'emergency';if(route==='emergency')this.protect();}
    if(['hold','confirm','questions'].includes(route)&&this.transferStatus==='cancelled')route='cancelled';
    if(['select','details','review'].includes(route)&&this.caseSubmitted)route='tracking';
    if(this.route===route){this.touch();return;}
    if(this.reportStatus==='sending'&&route!=='tracking'){this.reportStatus='idle';this.reportElapsed=0;}
    if(this.route==='call'&&route!=='call')this.callActive=false;
    const from=this.route;if(!replace)this.stack.push(from);
    this.route=route;this.transition={from,to:route,elapsed:0};this.notice='';this.noticeMs=0;this.touch();
    if(route==='notifications')this.readNotifications=true;
  }
  back(){
    let target=this.stack.pop()??'home';
    const skip=route=>route===this.route||route==='submitting'||(route==='call'&&!this.callActive)||(this.caseSubmitted&&['select','details','review'].includes(route))||(this.accountProtected&&['recipient','amount','confirm','questions','service','serviceReview'].includes(route));
    while(skip(target)&&this.stack.length)target=this.stack.pop();
    if(skip(target))target='home';
    if(this.caseSubmitted&&['select','details','review'].includes(target))target='home';
    if(target==='submitting')target='review';
    this.go(target,{replace:true});
  }
  protect(){
    if(!this.accountProtected){this.accountProtected=true;this.protectionElapsed=0;}
    if(['draft','review'].includes(this.transferStatus)&&this.amountCents>0)this.transferStatus='held';
  }
  takeControl(){this.mode='manual';this.autoPlaying=false;this.autoIndex=-1;this.paused=false;}
  setAmount(raw){this.amountRaw=String(raw).slice(0,16);this.notice='';this.noticeMs=0;this.touch();}
  validAmount(){
    const cents=parseAmount(this.amountRaw);
    if(cents===null){this.notify('ระบุจำนวนเงินมากกว่า 0 และทศนิยมไม่เกิน 2 ตำแหน่ง');return false;}
    if(cents>this.balanceCents){this.notify('ยอดเกินเงินคงเหลือตัวอย่าง กรุณาลดจำนวนเงิน');return false;}
    this.amountCents=cents;return true;
  }
  dispatch(action,value=null,{automatic=false}={}){
    if(!automatic)this.takeControl();
    this.notice='';this.noticeMs=0;
    switch(action){
      case 'home':this.stack=[];this.go('home',{replace:true});break;
      case 'back':this.back();break;
      case 'go':this.go(value);break;
      case 'transfer':
        if(this.accountProtected){this.go('blocked');break;}
        if(this.transferStatus==='held'){this.go('hold');this.notify('มีรายการที่พักไว้ ตรวจสอบหรือยกเลิกก่อนเริ่มรายการใหม่');break;}
        if(['idle','cancelled'].includes(this.transferStatus)){this.amountRaw='';this.amountCents=0;this.answers=[null,null,null];this.holdElapsed=0;}
        this.transferStatus='draft';this.go('recipient');break;
      case 'recipient-select':if(this.accountProtected)this.go('blocked');else this.go('amount');break;
      case 'amount-preset':this.setAmount(value);break;
      case 'amount-key':{
        const raw=this.amountRaw.replaceAll(',','');
        if(value==='backspace')this.setAmount(raw.slice(0,-1));
        else if(value==='clear')this.setAmount('');
        else if(value==='.'&&!raw.includes('.'))this.setAmount((raw||'0')+'.');
        else if(/^\d$/.test(value)&&raw.length<10&&(!raw.includes('.')||raw.split('.')[1].length<2))this.setAmount(raw==='0'?value:raw+value);
        break;
      }
      case 'amount-next':
        if(this.accountProtected)this.go('blocked');
        else if(this.validAmount()){this.transferStatus='review';this.go('confirm');}
        break;
      case 'risk':this.go('questions');break;
      case 'answer':{const[index,answer]=String(value).split(':');if(['0','1','2'].includes(index))this.answers[Number(index)]=answer==='true';this.reviewElapsed=0;break;}
      case 'advice':
        if(this.answers.some(v=>v===null)){this.notify('เลือกคำตอบให้ครบทั้ง 3 ข้อก่อนดูคำแนะนำ');break;}
        this.transferStatus='held';this.holdElapsed=0;this.go('hold');break;
      case 'cancel-request':this.go('cancel');break;
      case 'cancel-yes':this.transferStatus='cancelled';this.holdElapsed=COUNTDOWN_MS;this.stack=[];this.go('cancelled',{replace:true});break;
      case 'emergency':this.protect();this.go('emergency');break;
      case 'report-start':
        if(!this.statusReady){this.notify('กำลังเปิดการป้องกันบัญชี กรุณารอสักครู่');break;}
        this.go(this.caseSubmitted?'tracking':'select');break;
      case 'select-prior':this.selectedTxn=!this.selectedTxn;break;
      case 'report-details':if(this.selectedTxn)this.go('details');else this.notify('เลือกรายการที่เคยโอนไปแล้วเพื่อแจ้งเหตุ');break;
      case 'reason':if(reasons[value])this.reason=value;break;
      case 'consent':this.consent=value==='true'?true:value==='false'?false:!this.consent;break;
      case 'report-review':
        if(!this.selectedTxn){this.go('select');break;}
        if(!this.reason){this.notify('เลือกเหตุการณ์ที่ตรงกับตัวอย่างก่อน');break;}
        if(!this.consent){this.notify('ยืนยันความยินยอมในเดโมก่อนดำเนินการ');break;}
        this.go('review');break;
      case 'report-send':
        if(this.reportStatus==='sending')break;
        if(this.caseSubmitted){this.go('tracking');break;}
        if(!this.selectedTxn||!this.reason||!this.consent){this.notify('กรุณาตรวจสอบรายการ เหตุการณ์ และความยินยอม');break;}
        this.go('submitting');this.reportStatus='sending';this.reportElapsed=0;break;
      case 'transaction':this.transactionId=value||'prior';this.go('transaction');break;
      case 'track':this.go(this.caseSubmitted?'tracking':'transactions');break;
      case 'contact':this.contactChoice='';this.go('contact');break;
      case 'chat':this.contactChoice='';this.go('chat');break;
      case 'chat-choice':this.contactChoice=value;break;
      case 'call':this.callActive=true;this.callElapsed=0;this.go('call');break;
      case 'end-call':this.callActive=false;this.go('contact',{replace:true});break;
      case 'evidence-open':if(evidenceNames[value])this.viewer=value;this.go('viewer');break;
      case 'add-evidence':this.evidenceDraft=new Set(this.evidenceSet);this.go('addEvidence');break;
      case 'evidence-toggle':if(evidenceNames[value]){if(this.evidenceDraft.has(value))this.evidenceDraft.delete(value);else this.evidenceDraft.add(value);}break;
      case 'evidence-save':
        if(!this.evidenceDraft.size){this.notify('เลือกหลักฐานตัวอย่างอย่างน้อย 1 รายการ');break;}
        this.evidenceSet=new Set(this.evidenceDraft);this.go(this.caseSubmitted?'tracking':'details');break;
      case 'next-steps':this.go('nextSteps');break;
      case 'aoc-ready':this.aocPrepared=true;this.go('nextSteps');break;
      case 'devices-end':this.otherDevicesEnded=true;this.notify('จบเซสชันอุปกรณ์อื่นในเดโมแล้ว');break;
      case 'password-check':this.passwordChecked=true;this.go('security');break;
      case 'balance':this.balanceVisible=!this.balanceVisible;break;
      case 'service-start':
        if(this.accountProtected){this.go('blocked');break;}
        if(services[value]){this.serviceKind=value;this.serviceAmount=services[value].amounts[0]*100;this.go('service');}break;
      case 'service-amount':if(services[this.serviceKind].amounts.includes(Number(value)))this.serviceAmount=Number(value)*100;break;
      case 'service-next':if(this.accountProtected)this.go('blocked');else this.go('serviceReview');break;
      case 'service-confirm':
        if(this.route!=='serviceReview')break;
        if(this.accountProtected){this.go('blocked');break;}
        if(this.serviceAmount>this.balanceCents){this.notify('เงินคงเหลือตัวอย่างไม่เพียงพอ');break;}
        this.balanceCents-=this.serviceAmount;
        this.serviceReceipts.push({id:`service-${this.serviceReceipts.length+1}`,kind:this.serviceKind,amount:this.serviceAmount});
        this.go('serviceDone');break;
      case 'scan-sample':
        if(this.accountProtected)this.go('blocked');else if(this.transferStatus==='held')this.go('hold');else{this.transferStatus='draft';this.go('amount');}break;
      default:return false;
    }
    this.touch();return true;
  }
  next(){if(this.primaryAction)this.dispatch(this.primaryAction);else this.dispatch('home');}
  startAuto(){const continuous=this.continuous;this.reset();this.continuous=continuous;this.mode='auto';this.autoIndex=0;this.autoPlaying=true;this.touch();}
  playPause(){
    if(this.paused){this.paused=false;if(this.mode==='auto')this.autoPlaying=true;return;}
    if(this.running){this.paused=true;return;}
    if(this.mode==='auto'&&this.autoIndex<walkthrough.length){this.autoPlaying=true;return;}
    this.startAuto();
  }
  tick(delta){
    if(this.paused||!Number.isFinite(delta)||delta<=0)return;
    const effectDelta=this.transition?Math.max(0,delta-Math.max(0,TRANSITION_MS-this.transition.elapsed)):delta;
    if(this.transition){this.transition.elapsed+=delta;if(this.transition.elapsed>=TRANSITION_MS)this.transition=null;}
    if(this.tap){this.tap.elapsed+=delta;if(this.tap.elapsed>=650)this.tap=null;}
    if(this.noticeMs>0){this.noticeMs=Math.max(0,this.noticeMs-delta);if(!this.noticeMs){this.notice='';this.touch();}}
    if(this.transferStatus==='held')this.holdElapsed=Math.min(COUNTDOWN_MS,this.holdElapsed+effectDelta);
    if(this.accountProtected){this.protectionElapsed=Math.min(PROTECTION_MS,this.protectionElapsed+effectDelta);if(this.statusReady)this.otherDevicesEnded=true;}
    if(this.route==='questions'&&this.answers.every(v=>v!==null))this.reviewElapsed=Math.min(450,this.reviewElapsed+delta);
    if(this.callActive)this.callElapsed=Math.min(2200,this.callElapsed+delta);
    if(this.reportStatus==='sending'){
      this.reportElapsed=Math.min(REPORT_MS,this.reportElapsed+delta);
      if(this.reportElapsed===REPORT_MS){this.reportStatus='submitted';this.caseSubmitted=true;this.go('tracking',{replace:true});}
    }
    if(this.autoPlaying&&this.cue){
      this.autoElapsed+=delta;
      if(!this.autoApplied&&this.autoElapsed>=this.cue.duration-800){this.autoApplied=true;if(this.cue.action)this.dispatch(this.cue.action,this.cue.value,{automatic:true});}
      if(this.autoElapsed>=this.cue.duration){
        this.autoIndex++;this.autoElapsed=0;this.autoApplied=false;this.touch();
        if(this.autoIndex>=walkthrough.length){this.autoPlaying=false;this.mode='manual';this.autoIndex=-1;}
        else if(!this.continuous){this.autoPlaying=false;this.paused=true;}
      }
    }
  }
}
