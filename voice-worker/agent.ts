import {cli,defineAgent,inference,ServerOptions,voice,type JobContext,type llm} from '@livekit/agents';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

// The worker owns media only. Facts and policy stay in the existing V5 service.
// DeepSeek extraction remains consent-gated in V5; it cannot execute a booking.
export default defineAgent({
 entry:async(ctx:JobContext)=>{
  const meta=JSON.parse(ctx.job.metadata);
  const backend=new URL(process.env.VOICE_BACKEND_URL||'http://127.0.0.1:8787');
  if(backend.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(backend.hostname))throw Error('VOICE_BACKEND_HTTPS_REQUIRED');
  let closed=false,revision=0,speechRevision=0,epoch=0,interim='',started=false;
  const bridge=async(body:Record<string,unknown>)=>{
   const response=await fetch(new URL('/api/v5/voice/bridge',backend),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+meta.secret},body:JSON.stringify({room:meta.room,...body}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('VOICE_BACKEND_'+response.status);return response.json();
  };
  const publish=async(packet:Record<string,unknown>)=>{if(!closed)await ctx.room.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify(packet)),{reliable:true,topic:'travel.state',destination_identities:[meta.participant]});};
  const session=new voice.AgentSession({
   stt:new inference.STT({model:process.env.LIVEKIT_STT_MODEL||'deepgram/nova-3',language:process.env.LIVEKIT_STT_LANGUAGE||'multi'}),
   tts:new inference.TTS({model:process.env.LIVEKIT_TTS_MODEL||'cartesia/sonic-3',voice:process.env.LIVEKIT_TTS_VOICE||'9626c31c-bec5-4cca-baa8-f8ba9e84c8bc'}),
   turnHandling:{turnDetection:new inference.TurnDetector(),endpointing:{minDelay:500,maxDelay:6000},interruption:{enabled:true,mode:'adaptive',resumeFalseInterruption:true,falseInterruptionTimeout:2000},preemptiveGeneration:{enabled:false}},
   aecWarmupDuration:3000,
  });
  const emit=async(out:any,speak:boolean)=>{if(closed)return;revision=out.revision;await publish(out);if(out.paused){session.input.setAudioEnabled(false);session.interrupt({force:true});}else if(speak&&out.spoken_text)session.say(out.spoken_text,{allowInterruptions:true});};
  class Companion extends voice.Agent {
   constructor(){super({instructions:'Use only the authorized V5 state service. No direct tool execution or free policy generation.'});}
   async onUserTurnCompleted(_chat:llm.ChatContext,message:llm.ChatMessage){
    const token=epoch,text=message.textContent||'';interim='';
    try{const out=await bridge({type:'speech.final',event_id:randomUUID(),base_revision:speechRevision,text});if(token===epoch&&!closed)await emit(out,out.type!=='speech.draft');}
    catch(_){await publish({type:'voice.error',message:'Voice sync failed. Use text or reconnect.'});}
    throw new voice.StopResponse();
   }
  }
  await ctx.connect();
  await ctx.waitForParticipant(meta.participant);
  ctx.room.localParticipant!.registerRpcMethod('travel.control',async(data)=>{
   if(data.callerIdentity!==meta.participant)throw Error('CALLER_NOT_ALLOWED');
   const b=JSON.parse(data.payload);if(!started)throw Error('AGENT_STARTING');
   if(b.type==='interrupt'||b.type==='sync'){epoch++;session.interrupt({force:true});if(interim)await publish({type:'speech.draft',draft:interim});interim='';session.clearUserTurn();}
   if(b.type==='sync'){const out=await bridge({type:'snapshot'});await emit(out,true);}
   else if(b.type==='mute'){session.input.setAudioEnabled(b.value!==true);if(b.value===true){epoch++;session.interrupt({force:true});session.clearUserTurn();}}
   else if(b.type==='output')session.output.setAudioEnabled(b.value===true);
   else if(b.type!=='interrupt')throw Error('CONTROL_NOT_ALLOWED');
   return '{}';
  });
  session.on(voice.AgentSessionEventTypes.UserStateChanged,e=>{if(e.newState==='speaking')speechRevision=revision;});
  session.on(voice.AgentSessionEventTypes.UserInputTranscribed,e=>{interim=e.transcript;void publish({type:'speech.interim',text:e.transcript}).catch(()=>{});});
  session.on(voice.AgentSessionEventTypes.AgentStateChanged,e=>{void publish({type:'voice.phase',phase:e.newState}).catch(()=>{});});
  session.on(voice.AgentSessionEventTypes.AgentFalseInterruption,()=>{void publish({type:'voice.false_interruption',recovered:true}).catch(()=>{});});
  await session.start({agent:new Companion(),room:ctx.room,record:false,inputOptions:{participantIdentity:meta.participant,textEnabled:false,videoEnabled:false,closeOnDisconnect:true,deleteRoomOnClose:true},outputOptions:{transcriptionEnabled:false}});
  started=true;
  const first=await bridge({type:'snapshot'});speechRevision=first.revision;await emit(first,true);
  const lease=setInterval(()=>{void bridge({type:'snapshot'}).catch(async()=>{closed=true;clearInterval(lease);await session.close();ctx.shutdown('session revoked');});},10000);
  ctx.addShutdownCallback(async()=>{closed=true;epoch++;clearInterval(lease);await session.close();});
 },
});
if(process.argv[1]===fileURLToPath(import.meta.url))cli.runApp(new ServerOptions({agent:fileURLToPath(import.meta.url),agentName:'visit-china'}));
