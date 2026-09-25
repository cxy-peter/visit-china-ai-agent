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
    if(!this.active||this.muted||this.phase!=='listening'||!this.rec)return;
    const samples=event.inputBuffer.getChannelData(0);let sum=0;for(const n of samples)sum+=n*n;
    this.onLevel(Math.min(1,Math.sqrt(sum/samples.length)*6));
    try{this.rec.acceptWaveform(event.inputBuffer);}catch(_){this.mute(true);this.emit('voice_error','本机识别暂停，请恢复麦克风或改用文字。');}
   };
   this.ready=true;const say=this.pendingSay;this.pendingSay=null;
   if(say)this.speak(say);else this.listen();
  }catch(error){if(life!==this.lifecycle||!this.active)return;this.stop();this.emit(error.name==='NotAllowedError'?'permission_denied':'unavailable',error.name==='NotAllowedError'?'麦克风未获允许，可在地址栏开启权限或继续打字。':error.message);}
 }
 emit(phase,detail=''){if(this.stream)this.stream.getAudioTracks().forEach(t=>{t.enabled=phase==='listening'&&!this.muted;});super.emit(phase,detail);}
 cancel(options={}){if(this.rec){this.rec.remove();this.rec=null;}super.cancel(options);this.onLevel?.(0);}
 speak(text){if(this.active&&!this.ready){this.pendingSay=text;return;}super.speak(text);}
 listen(){
  if(!this.active||!this.ready)return;if(this.muted){this.emit('muted');return;}
  if(this.rec)this.rec.remove();const token=++this.epoch,rec=new this.model.KaldiRecognizer(this.audio.sampleRate);this.rec=rec;let sent=false;
  rec.on('partialresult',m=>{if(!this.active||this.muted||token!==this.epoch||sent)return;this.pendingInterim=normalize(m.result.partial);this.onCaption(this.pendingInterim);});
  rec.on('result',m=>{if(!this.active||this.muted||token!==this.epoch||sent)return;const text=normalize(m.result.text);if(!text)return;sent=true;this.pendingInterim='';this.onCaption(text);this.emit('processing');this.onText(text);});
  this.emit('listening','本机识别中 · 说完稍停即可发送，也可点击“说完了”。');
 }
 finish(){if(this.phase==='listening')this.rec?.retrieveFinalResult();}
 mute(value=true){if(value){this.cancel({preserveInterim:true});this.muted=true;this.emit('muted');}else super.mute(false);}
 stop(){this.lifecycle=(this.lifecycle||0)+1;this.cancelLoading?.();this.cancelLoading=null;super.stop();this.ready=false;this.pendingSay=null;
  if(this.processor){this.processor.onaudioprocess=null;this.processor.disconnect();}this.source?.disconnect();this.silent?.disconnect();
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.audio?.close().catch(()=>{});this.audio=null;
  this.model?.terminate();this.model=null;this.onLevel?.(0);
 }
}
return{Call,normalize};
});
