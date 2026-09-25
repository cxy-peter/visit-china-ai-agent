'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const E=require('./engine');
const turn=(s,text,channel='voice')=>E.apply(s,{type:'text',text,channel});
test('opening request and historical replies survive later corrections',()=>{
 let s=turn(E.state(),'I am planning a Shanghai trip with my parents. I need a hotel.');
 const opening=s.initialRequest.text,reply=s.history[0].reply;
 s=turn(s,'Actually Beijing. My flight is booked. My hotel is booked.');
 assert.equal(s.initialRequest.text,opening);assert.equal(s.facts.city,'Beijing');assert.equal(s.history[0].reply,reply);assert.notEqual(s.history[1].reply,reply);
});
test('first request survives history truncation and excludes greeting-only messages',()=>{
 let s=turn(E.state(),'你好');assert.equal(s.initialRequest,null);s=turn(s,'我想带父母去上海，需要地铁票');
 for(let i=0;i<40;i++)s=turn(s,'补充 '+i);
 assert.equal(s.history.length,30);assert.equal(s.initialRequest.text,'我想带父母去上海，需要地铁票');assert.ok(s.tasks.includes('metro'));
});
test('memory restores conversation but cannot inject workflow or confirmation',()=>{
 const original=turn(E.state(),'Shanghai. I need a hotel, my email is person@example.org');
 const restored=E.restoreMemory({...E.memory(original),policy:{version:'evil'},confirmedRevision:1});
 assert.equal(restored.policy.version,'wf-1');assert.equal(restored.confirmedRevision,null);assert.equal(restored.history[0].reply,original.history[0].reply);
 assert.ok(!restored.initialRequest.text.includes('person@example.org'));assert.equal(E.state().initialRequest,null);
});
test('old facts-only memory remains supported and unknown facts are rejected',()=>{
 assert.equal(E.restoreMemory({facts:{city:'Shanghai'}}).history.length,0);assert.throws(()=>E.restoreMemory({facts:{admin:true}}),/FIELD/);
});
test('unpunctuated Chinese voice keeps booked flight separate from hotel need',()=>{
 const s=turn(E.state(),'我想带父母去上海旅游机票已经订好了我需要酒店和地铁票');assert.equal(s.facts.flight,'booked');assert.equal(s.facts.hotel,'not_booked');assert.ok(s.tasks.includes('hotel'));
});
test('transcript cannot turn unfinished speech into saved facts',()=>{
 const original=E.state();assert.equal(original.history.length,0);assert.equal(original.initialRequest,null);
 const s=turn(original,'I need metro tickets in Shanghai');assert.ok(s.tasks.includes('metro'));assert.ok(s.history[0].reply);
});
test('memory keeps skipped questions and current task context',()=>{
 let s=turn(E.state(),'Planning Shanghai next month');s=E.apply(s,{type:'choice',id:'skip-flight'});const restored=E.restoreMemory(E.memory(s));assert.equal(E.reply(restored).question,'hotel');
 s=turn(s,'I need metro tickets');assert.equal(E.restoreMemory(E.memory(s)).currentIssue,'metro');
});

function rig({deny=false,delayed=false}={}){
 const tracks=[{enabled:true,stopped:false,stop(){this.stopped=true;}}],captions=[],texts=[],phases=[],levels=[],models=[];
 class Model{constructor(){models.push(this);this.listeners={};this.ready=true;this.recognizers=[];const model=this;this.KaldiRecognizer=class{constructor(){this.listeners={};model.recognizers.push(this);}on(e,f){this.listeners[e]=f;}remove(){this.removed=true;}acceptWaveform(){}retrieveFinalResult(){this.finalRequested=true;}};}
 on(e,f){this.listeners[e]=f;if(e==='load'&&!delayed)queueMicrotask(()=>f({result:true}));}terminate(){this.terminated=true;}}
 class Audio{constructor(){this.sampleRate=48000;}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createMediaStreamSource(){return {connect(){},disconnect(){}};}createScriptProcessor(){return {connect(){},disconnect(){}};}createGain(){return {gain:{value:1},connect(){},disconnect(){}};}}
 const synth={getVoices:()=>[{localService:true,lang:'en-US'}],cancel(){},speak(u){this.last=u;}};
 const context=vm.createContext({setTimeout,clearTimeout,URL,AudioContext:Audio,Vosk:{Model},location:{href:'https://example.test/'},navigator:{mediaDevices:{getUserMedia:async()=>{if(deny)throw Object.assign(Error('denied'),{name:'NotAllowedError'});return {getTracks:()=>tracks,getAudioTracks:()=>tracks};}}},speechSynthesis:synth,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},console});
 for(const file of ['voice.js','local-voice.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);
 const call=new context.TravelLocalVoice.Call({onText:t=>texts.push(t),onCaption:t=>captions.push(t),onState:s=>phases.push(s.phase),onLevel:v=>levels.push(v)});
 return {call,tracks,captions,texts,phases,levels,models,synth};
}
test('local voice requires consent, streams captions, commits once and releases microphone',async()=>{
 const r=rig();await assert.rejects(r.call.start(),/CONSENT/);await r.call.start({consent:true});
 const rec=r.models[0].recognizers[0];rec.listeners.partialresult({result:{partial:'我 想 去 上 海'}});assert.equal(r.captions.at(-1),'我想去上海');assert.equal(r.texts.length,0);
 r.call.finish();assert.ok(rec.finalRequested);rec.listeners.result({result:{text:'Shanghai with parents'}});rec.listeners.result({result:{text:'duplicate'}});assert.equal(r.texts.length,1);
 r.call.stop();assert.ok(r.tracks[0].stopped);assert.ok(r.models[0].terminated);assert.equal(r.levels.at(-1),0);
 rec.listeners.result({result:{text:'late'}});assert.equal(r.texts.length,1);
});
test('local voice preserves drafts and ignores late results when a click interrupts',async()=>{
 const r=rig();const drafts=[];r.call.onDraft=t=>drafts.push(t);await r.call.start({consent:true});const rec=r.call.rec;
 rec.listeners.partialresult({result:{partial:'I also need'}});r.call.cancel({preserveInterim:true});rec.listeners.result({result:{text:'stale'}});
 assert.equal(drafts[0],'I also need');assert.equal(r.texts.length,0);r.call.stop();
});
test('local voice listens during playback for barge-in and disables tracks only on mute',async()=>{
 const r=rig();await r.call.start({consent:true});assert.equal(r.tracks[0].enabled,true);r.call.speak('Next question');assert.equal(r.tracks[0].enabled,true);
 r.synth.last.onend();assert.equal(r.tracks[0].enabled,true);r.call.mute();assert.equal(r.tracks[0].enabled,false);r.call.stop();
});
test('local voice refuses remote TTS when no system voice exists',async()=>{
 const r=rig();r.synth.getVoices=()=>[{localService:false,lang:'en-US'}];await r.call.start({consent:true});r.call.speak('Do not upload');assert.equal(r.synth.last,undefined);assert.equal(r.call.phase,'listening');assert.equal(r.call.output,false);r.call.stop();
});
test('hangup while model loads cannot later open the microphone',async()=>{
 const r=rig({delayed:true});const loading=r.call.start({consent:true});await new Promise(resolve=>setImmediate(resolve));const model=r.models[0];r.call.stop();model.listeners.load({result:true});await loading;assert.equal(r.call.active,false);assert.equal(r.call.stream,null);assert.ok(model.terminated);
});
test('denied microphone releases model and reports permission failure',async()=>{
 const r=rig({deny:true});await r.call.start({consent:true});assert.equal(r.call.active,false);assert.equal(r.phases.at(-1),'permission_denied');assert.ok(r.models[0].terminated);
});
test('local short phrase breaks accumulate into one complete multiline turn',async()=>{
 const r=rig();await r.call.start({consent:true});const rec=r.call.rec;
 rec.listeners.result({result:{text:'I am going to Shanghai.'}});
 rec.listeners.partialresult({result:{partial:'I also need a'}});
 assert.equal(r.texts.length,0);assert.match(r.captions.at(-1),/Shanghai\.\nI also/);
 r.call.finish();rec.listeners.result({result:{text:'I also need a hotel.'}});
 assert.equal(r.texts.length,1);assert.equal(r.texts[0],'I am going to Shanghai.\nI also need a hotel.');r.call.stop();
});
test('silence requests a real final result and never commits an interim transcript',async()=>{
 const r=rig();await r.call.start({consent:true});const rec=r.call.rec;
 rec.listeners.partialresult({result:{partial:'Shanghai'}});r.call.lastSound=Date.now()-r.call.endpointMs()-100;
 r.call.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4096)}});
 assert.equal(rec.finalRequested,true);assert.equal(r.texts.length,0);
 rec.listeners.result({result:{text:'Shanghai'}});assert.deepEqual(r.texts,['Shanghai']);r.call.stop();
});
test('local TTS output language can differ from the recognition language',async()=>{
 const r=rig();r.synth.getVoices=()=>[{localService:true,lang:'zh-CN'}];await r.call.start({consent:true,language:'en-US'});r.call.outputLanguage='zh-CN';r.call.speak('准备好了吗');assert.equal(r.synth.last.lang,'zh-CN');assert.equal(r.call.language,'en-US');r.synth.last.onend();assert.equal(r.call.phase,'listening');r.call.stop();
});
test('model phrase endpoint can finalize despite sustained background energy',async()=>{
 const r=rig();await r.call.start({consent:true});const rec=r.call.rec;r.call.silenceMs=1500;rec.listeners.result({result:{text:'Shanghai'}});r.call.lastSound=Date.now();await new Promise(resolve=>setTimeout(resolve,1700));assert.equal(rec.finalRequested,true);assert.equal(r.texts.length,0);rec.listeners.result({result:{text:''}});assert.deepEqual(r.texts,['Shanghai']);r.call.stop();
});


test('interrupted local ASR still waits for a full turn, rejects noise and ignores stale results',async()=>{
 const r=rig();r.call.acceptText=t=>E.speechDecision(t).accepted;const rejected=[];r.call.onRejected=t=>rejected.push(t);
 await r.call.start({consent:true});r.call.interruptAndListen();const old=r.call.rec;
 old.listeners.result({result:{text:'啊'}});assert.equal(r.texts.length,0);
 r.call.finish();old.listeners.result({result:{text:''}});assert.equal(r.texts.length,0);assert.equal(rejected.length,1);
 const current=r.call.rec;assert.notEqual(current,old);current.listeners.result({result:{text:'上海地铁怎么走'}});assert.equal(r.texts.length,0);r.call.finish();current.listeners.result({result:{text:''}});
 assert.equal(r.texts.length,1);assert.equal(r.texts[0],'上海地铁怎么走');old.listeners.result({result:{text:'late train'}});assert.equal(r.texts.length,1);r.call.stop();
});
