import { Timeline } from './timeline.js';

export const TRANSITION_MS = 420;
export const COUNTDOWN_MS = 15000;
export const PROTECTION_MS = 2400;
const clamp = v => Math.max(0, Math.min(1, v));
export const ease = value => {const t=clamp(value);return t*t*(3-2*t);};

/** One device, click-driven navigation, and one pausable clock for every effect. */
export class Simulator {
  constructor(scenes) {
    this.scenes=scenes;
    this.timeline=new Timeline(scenes);
    this.reset(0);
  }
  reset(scene=this.scene) {
    this.scene=scene;
    this.screen=0;
    this.mode='manual';
    this.paused=false;
    this.answers=[null,null,null];
    this.holdElapsed=0;
    this.protectionElapsed=0;
    this.reviewElapsed=0;
    this.transition=null;
    this.tap=null;
    this.notice='';
    this.timeline.reset(scene);
  }
  get key(){return `${this.scene}:${this.screen}`;}
  get cue(){return this.mode==='auto'?this.timeline.current:null;}
  get hasPending(){
    if(this.transition || this.tap || (this.mode==='auto' && this.timeline.playing))return true;
    if(this.mode!=='manual')return false;
    if(this.scene===0 && this.screen===2)return this.holdElapsed<COUNTDOWN_MS;
    if(this.scene===1 && this.screen===1)return this.protectionElapsed<PROTECTION_MS;
    return this.scene===0 && this.screen===1 && this.answers.every(v=>v!==null) && this.answers.includes(true) && this.reviewElapsed<450;
  }
  get running(){return !this.paused && this.hasPending;}
  get countdown(){
    if(this.mode==='auto'){
      if(this.scene!==0 || this.timeline.step<10)return 45;
      return this.timeline.step>10?0:45-Math.floor(clamp(this.timeline.elapsed/COUNTDOWN_MS)*45);
    }
    return Math.max(0,45-Math.floor(this.holdElapsed/COUNTDOWN_MS*45));
  }
  get questionAnswers(){
    if(this.mode!=='auto')return this.answers;
    return [0,1,2].map(i=>this.timeline.step>4+i || (this.timeline.step===4+i && this.timeline.elapsed>=1300)?true:null);
  }
  answerCover(i){
    if(this.mode!=='auto')return this.answers[i]===true?0:1;
    return this.timeline.step<4+i?1:this.timeline.step>4+i?0:1-ease((this.timeline.elapsed-1300)/500);
  }
  statusCover(i){
    if(this.mode!=='auto')return 1-ease((this.protectionElapsed-(300+i*700))/450);
    return this.timeline.step<3+i?1:this.timeline.step>3+i?0:1-ease(this.timeline.elapsed/700);
  }
  get reviewCover(){
    if(this.mode==='auto')return this.timeline.step<7?1:0;
    return this.answers.some(v=>v===null)||!this.answers.includes(true)?1:1-ease(this.reviewElapsed/450);
  }
  takeControl(){
    if(this.mode==='auto'){
      this.answers=[...this.questionAnswers];
      this.holdElapsed=(45-this.countdown)/45*COUNTDOWN_MS;
      this.protectionElapsed=this.timeline.scene===1 && this.timeline.step>=6?PROTECTION_MS:0;
      this.reviewElapsed=this.answers.every(v=>v!==null)?450:0;
    }
    this.mode='manual';
    this.timeline.pause();
    this.paused=false;
    this.notice='';
  }
  navigate(scene,screen,{animate=true,restart=false}={}){
    const from=this.key;
    this.scene=scene;this.screen=screen;this.notice='';
    if(restart && scene===0 && screen===2)this.holdElapsed=0;
    if(restart && scene===1 && screen===1)this.protectionElapsed=0;
    this.transition=animate && from!==this.key?{from,to:this.key,elapsed:0}:null;
  }
  checkRisk(){this.takeControl();this.navigate(0,1);}
  answer(index,value){
    if(this.scene!==0 || this.screen!==1)return;
    this.takeControl();this.answers[index]=value;this.reviewElapsed=0;
  }
  advice(){
    this.takeControl();
    if(this.answers.some(v=>v===null)){
      this.notice='เลือกคำตอบทั้ง 3 ข้อ แล้วกด “ดูคำแนะนำ”';return false;
    }
    this.navigate(0,2,{restart:true});return true;
  }
  emergency(){this.takeControl();this.navigate(1,1,{restart:true});}
  report(){
    this.takeControl();
    if(this.protectionElapsed<PROTECTION_MS){this.notice='กำลังป้องกันบัญชี โปรดรอสักครู่';return false;}
    this.navigate(1,2);return true;
  }
  next(){
    this.takeControl();
    if(this.screen<2)this.navigate(this.scene,this.screen+1,{restart:true});
  }
  back(){this.takeControl();if(this.screen>0)this.navigate(this.scene,this.screen-1);}
  startAuto(){
    this.mode='auto';this.paused=false;this.notice='';
    this.timeline.reset(this.scene);
    this.timeline.seek([[0,3,9],[0,2,8]][this.scene][this.screen]);
    this.timeline.play();
  }
  playPause(){
    if(this.paused){this.paused=false;return;}
    if(this.running){this.paused=true;return;}
    if(this.mode==='auto'){this.timeline.play();return;}
    this.startAuto();
  }
  tick(delta){
    if(this.paused || !Number.isFinite(delta) || delta<=0)return;
    if(this.tap){this.tap.elapsed+=delta;if(this.tap.elapsed>=650)this.tap=null;}
    if(this.transition){this.transition.elapsed+=delta;if(this.transition.elapsed>=TRANSITION_MS)this.transition=null;}
    if(this.mode==='auto'){
      this.timeline.tick(delta);
      const screen=this.timeline.current?.phone??0;
      if(this.scene!==this.timeline.scene || this.screen!==screen)this.navigate(this.timeline.scene,screen);
    }else if(!this.transition){
      if(this.scene===0 && this.screen===2)this.holdElapsed=Math.min(COUNTDOWN_MS,this.holdElapsed+delta);
      if(this.scene===1 && this.screen===1)this.protectionElapsed=Math.min(PROTECTION_MS,this.protectionElapsed+delta);
      if(this.scene===0 && this.screen===1 && this.answers.every(v=>v!==null))this.reviewElapsed=Math.min(450,this.reviewElapsed+delta);
    }
  }
}
