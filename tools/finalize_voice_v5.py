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
p=ROOT/'v5/style.css'
s=p.read_text().replace('#5a7286f','#5a7286')
p.write_text(s)
print('V5 release fixes applied or already present.')
