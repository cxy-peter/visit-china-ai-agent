"""Idempotent release fixes; fail if source shape unexpectedly differs."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def replace(file, old, new):
    p = ROOT / file
    text = p.read_text()
    if old in text:
        assert text.count(old) == 1, (file, 'ambiguous edit')
        p.write_text(text.replace(old, new))
    else:
        assert new in text, (file, 'source conflict')
replace('v5/engine.js', "if(hn){p.hotelName=hn[1].trim();p.hotel='booked';}", "if(hn&&!/^(?:booked|not booked|already booked|已订|未订|没订)$/i.test(hn[1].trim())){p.hotelName=hn[1].trim();p.hotel='booked';}")
replace('v5/engine.js', "}else throw Error('EVENT_NOT_ALLOWED');", "}else if(event.type==='outcome'){if(!reply(previous).plan.some(x=>x.id===event.task))throw Error('TASK_NOT_PRESENT');s.outcomes[event.task]='done';message='User confirmed task complete: '+event.task;s.confirmedRevision=previous.confirmedRevision===previous.revision?s.revision:null;}else throw Error('EVENT_NOT_ALLOWED');")
replace('v5/server.js', "if(!['text','choice','confirm'].includes(b.event?.type))", "if(!['text','choice','confirm','outcome'].includes(b.event?.type))")
replace('v5/app.js', "state.outcomes[d.dataset.done]='done';render();toast('已记录你的完成确认；不是平台交易回执。');", "commit({type:'outcome',task:d.dataset.done,channel:'click'});toast('已记录你的完成确认；不是平台交易回执。');")
replace('v5/engine.js', "if(p.flight==='not_booked')tasks.push('flight');", "if(/need (?:a|an) hotel\\b/i.test(s))p.hotel='not_booked';if(/need (?:a|an) flight\\b/i.test(s))p.flight='not_booked';if(p.flight==='not_booked')tasks.push('flight');")
replace('v5/server.js', "if(p==='/api/v5/refine'){if(b.revision!==s.state.revision)throw Error('STALE_REVISION');", "if(p==='/api/v5/refine'){if(b.revision!==s.state.revision)throw Error('STALE_REVISION');if((s.state.facts.battery!==undefined&&s.state.facts.battery<=5)||['offline','poor'].includes(s.state.facts.network))return json(res,200,{mode:'context-limited',proposal:null});")
replace('v5/app.js', "async function refine(){if(!server||!$('model-consent').checked||queue.length||draining)return;", "async function refine(){if(!server||!$('model-consent').checked||queue.length||draining)return;if(E.reply(state).urgent||['offline','poor'].includes(state.facts.network)){modelController?.abort();$('model-note').textContent='低电量或网络受限：暂停模型调用，保留文字与现场求助。';return;}")
p=ROOT/'v5/style.css'
s=p.read_text().replace('#5a7286f','#5a7286')
p.write_text(s)
print('V5 release fixes applied or already present.')
# Keep the narrow security regression with the actual source change.
test_line = "test('HTTP low power blocks model traffic even with consent and key',async t=>{let called=0;const {client}=await fixture(t,{env:{DEEPSEEK_API_KEY:'test-key-not-real'},fetch:async()=>{called++;throw Error('should-not-call');}}),c=client();await c('login',{username:'admin',password:'admin-test'});await c('turn',{requestId:'low',expectedRevision:0,event:{type:'text',text:'Shanghai battery 3%'}});const out=await c('refine',{revision:1,modelConsent:true});assert.equal(out.body.mode,'context-limited');assert.equal(called,0);});"
t=ROOT/'v5/tests.js'
if test_line not in t.read_text():
    t.write_text(t.read_text().rstrip()+'\n'+test_line+'\n')
