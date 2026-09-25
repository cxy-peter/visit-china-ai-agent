/* Free, on-device streaming recognition. Audio goes only to a local WASM worker. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./voice'));else root.TravelLocalVoice=factory(root.TravelVoice);})(typeof globalThis!=='undefined'?globalThis:this,function(Voice){
'use strict';
let sdkPromise;
function loadSDK(){
 if(globalThis.Vosk)return Promise.resolve(globalThis.Vosk);
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='vosk.js';
  script.onload=()=>resolve(globalThis.Vosk);script.onerror=()=>{sdkPromise=null;script.remove();reject(Error('语音组件未加载，请检查网络后重试。'));};
  document.head.append(script);
 });return sdkPromise;
}
function normalize(text){return String(text||'').replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g,'$1').trim();}
class Call extends Voice.Call{
 constructor(options={}){super({...options,localOnly:true});this.onLevel=options.onLevel||(()=>{});this.lifecycle=0;this.ready=false;this.local=true;}
 async start(options={}){
  super.start(options);const life=this.lifecycle;
  this.emit('loading','首次加载约 40–45 MB 开源模型；下载后在本机识别，请稍候。');
  try{
   if(!globalThis.AudioContext||!navigator.mediaDevices?.getUserMedia)throw Error('此浏览器不支持本机语音，请使用新版 Chrome / Edge 或文字输入。');
   this.audio=new AudioContext();await this.audio.resume();
   const SDK=await loadSDK();if(life!==this.lifecycle||!this.active)return;
   this.model=new SDK.Model(new URL('models/'+(this.language.startsWith('zh')?'zh-cn':'en-us')+'.tar.gz',location.href).href,-1);
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('模型加载超时，可检查网络后重试。')),120000);
    const finish=(error)=>{clearTimeout(timer);this.cancelLoading=null;error?reject(error):resolve();};
    this.cancelLoading=()=>finish(Error('CANCELLED'));
    this.model.on('load',m=>finish(m.result?null:Error('模型加载失败，请检查可用空间后重试。')));
    this.model.on('error',()=>finish(Error('本机识别模型暂不可用。')));
   });
   if(life!==this.lifecycle||!this.active)return;
   const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(life!==this.lifecycle||!this.active){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.source=this.audio.createMediaStreamSource(stream);
   // ScriptProcessor remains supported in the targeted browsers; no external worklet/CDN.
   this.processor=this.audio.createScriptProcessor(4096,1,1);this.silent=this.audio.createGain();this.silent.gain.value=0;
   this.source.connect(this.processor);this.processor.connect(this.silent);this.silent.connect(this.audio.destination);
   this.processor.onaudioprocess=event=>{
    if(!this.active||this.muted||!['listening','speaking','processing'].includes(this.phase)||!this.rec||this.finalizing)return;
    const samples=event.inputBuffer.getChannelData(0);let sum=0;for(const n of samples)sum+=n*n;
    const rms=Math.sqrt(sum/samples.length),now=Date.now();this.onLevel(Math.min(1,rms*6));if(rms>.015)this.lastSound=now;if(this.pendingInterim&&this.lastSound&&now-this.lastSound>this.endpointMs()&&!this.finalizing)this.finish();
    try{this.rec.acceptWaveform(event.inputBuffer);}catch(_){this.mute(true);this.emit('voice_error','本机识别暂停，请恢复麦克风或改用文字。');}
   };
   this.ready=true;const say=this.pendingSay;this.pendingSay=null;
   if(say)this.speak(say);else this.listen();
  }catch(error){if(life!==this.lifecycle||!this.active)return;this.stop();this.emit(error.name==='NotAllowedError'?'permission_denied':'unavailable',error.name==='NotAllowedError'?'麦克风未获允许，可在地址栏开启权限或继续打字。':error.message);}
 }
 emit(phase,detail=''){if(this.stream)this.stream.getAudioTracks().forEach(t=>{t.enabled=this.active&&['listening','speaking','processing'].includes(phase)&&!this.muted;});super.emit(phase,detail);}
 cancel(options={}){clearTimeout(this.phraseTimer);clearTimeout(this.finalTimer);this.finalizing=false;this.lastSound=0;if(this.rec){this.rec.remove();this.rec=null;}super.cancel(options);this.onLevel?.(0);}
 speak(text){if(this.active&&!this.ready){this.pendingSay=text;return;}super.speak(text);}
 listen({mode='listening'}={}){
  if(!this.active||!this.ready)return;if(this.muted){this.emit('muted');return;}
  if(this.rec){this.emit(mode);return;}
  clearTimeout(this.phraseTimer);clearTimeout(this.finalTimer);this.finalizing=false;this.lastSound=0;this.inputNotified=false;const token=++this.epoch,rec=new this.model.KaldiRecognizer(this.audio.sampleRate);this.rec=rec;let sent=false,segments=[],lastPartial='';
  rec.on('partialresult',m=>{if(!this.active||this.muted||token!==this.epoch||sent||this.finalizing)return;const partial=normalize(m.result.partial);if(partial&&!this.observe(partial))return;const changed=partial&&partial!==lastPartial;if(changed)this.lastSound=Date.now();lastPartial=partial;this.pendingInterim=[...segments,partial].filter(Boolean).join('\n');this.onCaption(this.pendingInterim);if(changed)this.scheduleEndpoint();});
  rec.on('result',m=>{
   if(!this.active||this.muted||token!==this.epoch||sent)return;
   const text=normalize(m.result.text);if(text&&this.observe(text))segments.push(text);
   // Natural phrase boundaries can be shorter than a conversational turn. Keep all
   // finalized phrases visible until our silence endpoint (or explicit Send).
   if(!this.finalizing){this.pendingInterim=segments.join('\n');lastPartial='';this.onCaption(this.pendingInterim);if(this.pendingInterim)this.scheduleEndpoint();return;}
   const final=segments.join('\n');if(!final){this.finalizing=false;clearTimeout(this.finalTimer);this.cancel();this.listen();return;}
   sent=true;clearTimeout(this.finalTimer);this.finalizing=false;this.pendingInterim='';this.onCaption(final);this.deliver(final);
  });
  this.emit(mode,mode==='processing'?'正在整理回答，同时继续听你的补充。':mode==='speaking'?'正在播报，也在听你；直接说话即可插话。':'本机识别中 · 停顿约 2.6 秒后发送；可慢慢补充，也可点“说完了”。');
 }
 finish(){if(!this.active||this.muted||!this.rec||this.finalizing)return;clearTimeout(this.phraseTimer);this.finalizing=true;const token=this.epoch;this.rec.retrieveFinalResult();if(!this.finalizing||token!==this.epoch)return;this.finalTimer=setTimeout(()=>{if(token!==this.epoch||!this.active)return;if(!this.acceptText(this.pendingInterim)){this.onRejected(this.pendingInterim);this.cancel();this.listen();return;}this.cancel({preserveInterim:true});this.listen();this.emit('listening','未取得完整识别结果。片段已保留为可编辑草稿，也可以继续说。');},5000);}
 mute(value=true){if(value){this.cancel({preserveInterim:true});this.muted=true;this.emit('muted');}else super.mute(false);}
 stop(){this.lifecycle=(this.lifecycle||0)+1;this.cancelLoading?.();this.cancelLoading=null;super.stop();this.ready=false;this.pendingSay=null;
  if(this.processor){this.processor.onaudioprocess=null;this.processor.disconnect();}this.source?.disconnect();this.silent?.disconnect();
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.audio?.close().catch(()=>{});this.audio=null;
  this.model?.terminate();this.model=null;this.onLevel?.(0);
 }
}
return{Call,normalize};
});
