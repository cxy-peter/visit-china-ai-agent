'use strict';
const crypto=require('node:crypto');
const {AccessToken,AgentDispatchClient,RoomServiceClient,TrackSource}=require('livekit-server-sdk');
const E=require('./engine'),G=require('./governance');
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
function createRealtime({env,db,rooms,dispatch}){
 const required=['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'];
 const missing=required.filter(k=>!env[k]);let origin='';
 if(env.LIVEKIT_URL){const url=new URL(env.LIVEKIT_URL);if(url.protocol!=='wss:'||url.username||url.password||url.pathname!=='/'||url.search)throw Error('LIVEKIT_SECURE_URL_REQUIRED');origin=url.origin;}
 const service=rooms||(!missing.length?new RoomServiceClient(origin.replace('wss:','https:'),env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET):null);
 const dispatcher=dispatch||(!missing.length?new AgentDispatchClient(origin.replace('wss:','https:'),env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET):null);
 const limited=s=>E.reply(s.state).urgent||['offline','poor'].includes(s.state.facts.network);
 function envelope(s,eventId){const reply=E.reply(s.state);return {schema_version:1,session_id:s.callId,event_id:eventId||crypto.randomUUID(),revision:s.state.revision,state:s.state,spoken_text:limited(s)?'':reply.spoken,display_blocks:{summary:reply.summary,plan:reply.plan,suggestions:reply.suggestions},paused:limited(s),reply};}
 return {
  status:()=>({provider:'livekit',configured:missing.length===0,missing,validation:'not-live-validated'}),
  connectOrigin:origin,
  async token(s,b){
   if(missing.length)throw Error('LIVEKIT_NOT_CONFIGURED');if(b.consent!==true)throw Error('MICROPHONE_CONSENT_REQUIRED');if(!s.actor)throw Error('VOICE_ACCESS_REQUIRED');
   if(!s.callActive)throw Error('CALL_REQUIRED');if(limited(s))throw Error('VOICE_CONTEXT_LIMITED');
   let secret;
   db.changeSession(s,()=>{
    if(!s.media||s.media.ended||s.media.callId!==s.callId){secret=crypto.randomBytes(32).toString('hex');s.media={room:'vc-'+crypto.randomUUID(),participant:'traveler-'+crypto.randomUUID(),callId:s.callId,secretHash:sha(secret),ended:false,ready:false,createdAt:Date.now()};db.bindMedia(s.media.room,s);}
   });
   if(secret){
    const room=s.media.room;
    try{
     await service.createRoom({name:room,emptyTimeout:60,maxParticipants:2});
     await dispatcher.createDispatch(room,'visit-china',{metadata:JSON.stringify({room,secret,participant:s.media.participant})});
     db.changeSession(s,()=>{if(!s.callActive||s.media?.room!==room||s.media.ended)throw Error('CALL_ENDED');s.media.ready=true;});
    }catch(_){db.changeSession(s,()=>{if(s.media?.room===room)s.media.ended=true;});try{await service.deleteRoom(room);}catch(_){}throw Error('LIVEKIT_CONNECT_FAILED');}
   }else if(!s.media.ready)throw Error('VOICE_CONNECTING');
   const token=new AccessToken(env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET,{identity:s.media.participant,ttl:120});
   token.addGrant({roomJoin:true,room:s.media.room,canPublish:true,canPublishSources:[TrackSource.MICROPHONE],canSubscribe:true,canPublishData:true,canUpdateOwnMetadata:false});
   return {url:env.LIVEKIT_URL,token:await token.toJwt(),room:s.media.room,participant:s.media.participant,...envelope(s)};
  },
  async end(s){if(s.media&&service)try{await service.deleteRoom(s.media.room);}catch(_){/* Revocation in SQLite is authoritative even if transport is offline. */}},
  bridge(b,authorization){
   if(typeof b.room!=='string'||b.room.length>100)throw Error('ROOM_REQUIRED');
   const s=db.mediaSession(b.room),secret=String(authorization||'').replace(/^Bearer /,'');
   if(!s?.media||s.media.secretHash!==sha(secret)||s.media.ended||!s.callActive||s.media.callId!==s.callId)throw Error('VOICE_AUTH_REQUIRED');
   s.requestIds=new Map(s.requests||[]);
   if(b.type==='snapshot')return envelope(s);
   if(b.type!=='speech.final')throw Error('VOICE_EVENT_NOT_ALLOWED');
   return db.changeSession(s,()=>{
    if(s.media.ended||!s.callActive)throw Error('CALL_ENDED');
    if(typeof b.event_id!=='string'||!b.event_id.length||b.event_id.length>100)throw Error('EVENT_ID_REQUIRED');
    if(typeof b.text!=='string'||!b.text.trim()||b.text.length>2400)throw Error('TRANSCRIPT_INVALID');
    const key='voice:'+b.event_id,digest=G.digest({text:b.text,revision:b.base_revision}),old=s.requestIds.get(key);
    if(old){if(old.digest!==digest)throw Error('IDEMPOTENCY_CONFLICT');return old.result;}
    if(b.base_revision!==s.state.revision)return {...envelope(s,b.event_id),type:'speech.draft',draft:E.clean(b.text,1500)};
    s.state=E.apply(s.state,{type:'text',text:b.text,channel:'voice'});s.proposal=null;
    const result={...envelope(s,b.event_id),type:'state.patch'};s.requestIds.set(key,{digest,result});if(s.requestIds.size>200)s.requestIds.delete(s.requestIds.keys().next().value);return result;
   });
  }
 };
}
module.exports={createRealtime};
