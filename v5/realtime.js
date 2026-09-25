/* WebRTC transport for the existing call UI. No second journey store. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TravelRealtime=factory();})(globalThis,function(){
'use strict';
class Call {
 constructor(o={}){Object.assign(this,{api:o.api,onState:o.onState||(()=>{}),onCaption:o.onCaption||(()=>{}),onDraft:o.onDraft||(()=>{}),onPacket:o.onPacket||(()=>{}),SDK:o.SDK||globalThis.LivekitClient});this.active=false;this.phase='idle';this.epoch=0;this.muted=false;this.output=true;this.pendingInterim='';this.audio=new Set();this.remote=true;}
 emit(phase,detail=''){this.phase=phase;this.onState({phase,detail,active:this.active,muted:this.muted,output:this.output,startedAt:this.startedAt});}
 async start({consent=false}={}){
  if(!consent)throw Error('MICROPHONE_CONSENT_REQUIRED');this.stop();const epoch=this.epoch;this.active=true;this.startedAt=Date.now();this.emit('connecting');
  const room=new this.SDK.Room({adaptiveStream:true,dynacast:true,audioCaptureDefaults:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});this.room=room;
  // Called in the user's click handler, before token/network awaits.
  void room.startAudio().catch(()=>{});
  const current=()=>this.active&&epoch===this.epoch&&this.room===room;
  const event=this.SDK.RoomEvent;
  room.on(event.TrackSubscribed,(track,_publication,participant)=>{
   if(!current()||track.kind!=='audio'||participant.kind!==this.SDK.ParticipantKind.AGENT)return;
   const el=track.attach();el.muted=!this.output;this.audio.add(el);document.body.appendChild(el);el.play().catch(()=>{if(current())this.emit('audio_error','Tap Interrupt to enable playback.');});
  });
  room.on(event.TrackUnsubscribed,track=>{for(const el of track.detach()){el.remove();this.audio.delete(el);}});
  room.on(event.DataReceived,(bytes,participant,_kind,topic)=>{
   if(!current()||topic!=='travel.state'||participant?.kind!==this.SDK.ParticipantKind.AGENT||bytes.length>100000)return;
   this.agent=participant.identity;let p;try{p=JSON.parse(new TextDecoder().decode(bytes));}catch(_){return;}
   if(p.type==='speech.interim'){if(!this.pendingInterim)this.lastDraft='';this.pendingInterim=p.text;this.onCaption(p.text);return;}
   if(p.type==='speech.draft'){if(p.draft&&p.draft!==this.lastDraft){this.lastDraft=p.draft;this.onDraft(p.draft);}this.pendingInterim='';this.onCaption('');}
   if(p.type==='voice.phase'){clearTimeout(this.readyTimer);this.emit(this.muted?'muted':p.phase==='thinking'?'processing':p.phase);return;}
   if(p.type==='voice.error'){this.emit('voice_error',p.message);return;}
   if(p.state){clearTimeout(this.readyTimer);this.pendingInterim='';this.onCaption('');this.onPacket(p);if(p.paused)this.mute(true);}
  });
  room.on(event.Reconnecting,()=>{if(current()){for(const el of this.audio)el.muted=true;this.emit('reconnecting','Reconnecting; new speech is paused.');void room.localParticipant.setMicrophoneEnabled(false).catch(()=>{});}});
  room.on(event.Reconnected,()=>{if(current())void (async()=>{try{await this.control('sync');if(!this.muted)await room.localParticipant.setMicrophoneEnabled(true);for(const el of this.audio)el.muted=!this.output;this.emit(this.muted?'muted':'listening');}catch(_){this.emit('voice_error','Reconnect could not restore state. End and restart the call.');}})();});
  room.on(event.Disconnected,()=>{if(current()){this.stop();this.emit('voice_error','Connection ended. Start a new call to reconnect.');void this.api('end',{}).catch(()=>{});}});
  try{
   const grant=await this.api('voice/token',{consent:true});if(!current())return;
   await room.connect(grant.url,grant.token);if(!current()){await room.disconnect();return;}
   await room.localParticipant.setMicrophoneEnabled(true);if(!current()){await room.disconnect();return;}
   this.readyTimer=setTimeout(()=>{if(current()){this.stop();this.emit('voice_error','Media worker did not become ready. Check the worker and restart.');void this.api('end',{}).catch(()=>{});}},20000);
  }catch(e){if(current()){this.stop();this.emit(e.name==='NotAllowedError'?'permission_denied':'voice_error',e.message);void this.api('end',{}).catch(()=>{});}throw e;}
 }
 async control(type,extra={}){if(!this.active||!this.room)return;const agent=this.agent||[...this.room.remoteParticipants.values()].find(x=>x.kind===this.SDK.ParticipantKind.AGENT)?.identity;if(!agent)throw Error('VOICE_WORKER_NOT_READY');return this.room.localParticipant.performRpc({destinationIdentity:agent,method:'travel.control',payload:JSON.stringify({type,...extra}),responseTimeout:10000});}
 cancel({preserveInterim=false}={}){if(preserveInterim&&this.pendingInterim){this.lastDraft=this.pendingInterim;this.onDraft(this.pendingInterim);}this.pendingInterim='';this.onCaption('');for(const el of this.audio)el.muted=true;if(this.active)void this.control('interrupt').catch(()=>{});}
 speak(){/* Server-confirmed reply is synthesized by the media worker. */}
 async sync(){if(!this.active)return;try{await this.control('sync');for(const el of this.audio)el.muted=!this.output;}catch(e){this.emit('voice_error',e.message);}}
 interruptAndListen(){if(!this.active)return;void this.room.startAudio().catch(()=>{});this.cancel({preserveInterim:true});this.mute(false);}
 mute(value=true){this.muted=value;if(value)this.cancel({preserveInterim:true});if(this.room)void this.room.localParticipant.setMicrophoneEnabled(!value).catch(e=>this.emit('voice_error',e.message));void this.control('mute',{value}).catch(()=>{});for(const el of this.audio)el.muted=value||!this.output;this.emit(value?'muted':'listening');}
 setOutput(value){this.output=value;for(const el of this.audio)el.muted=!value;void this.control('output',{value}).catch(()=>{});this.emit(this.phase);}
 stop(){this.active=false;this.epoch++;clearTimeout(this.readyTimer);this.pendingInterim='';this.lastDraft='';this.onCaption('');const room=this.room;this.room=null;if(room){for(const pub of room.localParticipant.trackPublications.values())pub.track?.stop();void room.disconnect().catch(()=>{});}for(const el of this.audio)el.remove();this.audio.clear();this.agent=null;this.muted=false;this.startedAt=null;this.emit('ended');}
}
return {Call};
});
