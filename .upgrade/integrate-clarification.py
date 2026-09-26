"""Small additive fix to the exact deployed release; original prompts stay intact."""
import pathlib,subprocess,json
root=pathlib.Path(__file__).resolve().parents[1]
base='1bf13924a960f440dea64abe9821144852f2d009'
paths=['v5/assistant.js','v5/app.js','package.json','tools/public-chat-production-smoke.py']
original={p:subprocess.check_output(['git','show',base+':'+p],cwd=root) for p in paths}
for p,b in original.items():assert (root/p).read_bytes()==b,'Baseline changed: '+p
pending={p:b.decode() for p,b in original.items()}
def replace(path,old,new):
 assert pending[path].count(old)==1,(path,old[:80])
 pending[path]=pending[path].replace(old,new,1)
anchor=" execution.stages.push({name:'intent',status:'completed',ms:Date.now()-began});if(out.intentSchemaRepaired)execution.stages.push({name:'intent_schema_repair',status:'completed',attempts:1});"
replace('v5/assistant.js',anchor,anchor+"\n const clarification=require('./planning-clarification').build(h.text,out.value,state);\n if(clarification){execution.stages.push({name:'needs_clarification',status:'completed',questionIds:clarification.questions.map(q=>q.id)});return{...clarification,intent:{kind:'other',responseMode:'general',city:state.facts.city||intent.city||null},intentProvider:'deepseek',usage:out.usage,services:[]};}")
replace('v5/app.js',"deepseek:'DeepSeek · 共用对话助手',","deepseek:'DeepSeek · 共用对话助手','deepseek-clarification':'DeepSeek · 需求澄清 / Needs clarification',")
replace('v5/app.js',"function sourceHTML(h){const tool=","function sourceHTML(h){if(h.assistance?.mode==='deepseek-clarification')return '';const tool=")
config=json.loads(pending['package.json']);config['scripts']['test']+=' v5/planning-clarification.test.js';pending['package.json']=json.dumps(config,ensure_ascii=False,indent=2)+'\n'
replace('tools/public-chat-production-smoke.py',"QUESTION = (", "# Reuse the original failing production question; do not cherry-pick another prompt.\n# deepseek-clarification is a model-selected bounded needs-question path, not a factual answer.\nQUESTION = (")
for p,s in pending.items():(root/p).write_text(s)
pathlib.Path(__file__).unlink()
print('Integrated explicit needs clarification. No factual validator, original prompt or model budget was changed.')
