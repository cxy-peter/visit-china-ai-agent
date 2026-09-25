'use strict';
// Read-only compatibility audit. Never calls a provider or writes user state.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const BASE = '23872e914aa4c54df09762ead2ce29ec81078c83';
const checks = [];
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const old = file => execFileSync('git', ['show', BASE + ':' + file], {cwd:root, encoding:'utf8', maxBuffer:20*1024*1024});
const current = file => fs.readFileSync(path.join(root,file),'utf8');
function record(name, pass, detail={}) { checks.push({name,passed:Boolean(pass),...detail}); }
function literal(text,name) {
 const marker = 'const ' + name + '=`';
 const start = text.indexOf(marker);
 if (start < 0) throw Error('Missing template declaration: '+name);
 let i=start+marker.length, value='';
 for (;i<text.length;i++) {
  if(text[i]==='\\') {value+=text[i]+text[++i];continue;}
  if(text[i]==='`') return value;
  value+=text[i];
 }
 throw Error('Unclosed template: '+name);
}
function comparePrompt(file,name,allowAdditive=false) {
 const before=literal(old(file),name),after=literal(current(file),name);
 const retained=allowAdditive?after.includes(before):after===before;
 record(file+' '+name+' original literal retained',retained,{baseSha256:sha(before),currentSha256:sha(after),baseCharacters:before.length,currentCharacters:after.length,additive:allowAdditive});
 const exported=require(path.join(root,file))[name];
 if(typeof exported==='string') record(file+' exported prompt retains source text',exported.includes(before));
}
try {
 comparePrompt('v5/model-intent.js','PROMPT',true);
 comparePrompt('v5/assistant.js','PROMPT');
 comparePrompt('v5/server.js','EXTRACT');
 comparePrompt('v5/server.js','IMPROVE');
 const immutable=['v4/server.js','v5/model-routing.js','v5/voice.js','v5/governance.js','v5/answer-arbitration.js','prompts/V5_EXTRACTION.txt','prompts/V5_NODE_GENERATION.txt','prompts/V5_WORKFLOW_CANDIDATE.txt'];
 for(const file of immutable) {
  const before=old(file),after=current(file);
  record(file+' unchanged',before===after,{baseSha256:sha(before),currentSha256:sha(after)});
 }
 const Routing=require(path.join(root,'v5/model-routing'));
 const calls=[];
 const provider={status:()=>({configured:true}),call:(...args)=>{calls.push(args);return Promise.resolve({});}};
 for(const mode of ['flash','pro']) {
  const state={history:[{text:'hello'}]};
  const selected=Routing.select(state,mode);
  Routing.scoped(provider,selected).call('original-system',{message:'public fixture'},undefined,{temperature:0});
  const args=calls.at(-1),opts=args[3];
  record(mode+' provider and original system retained',args[0]==='original-system'&&opts.model===selected.model&&opts.temperature===0);
  record(mode+' output budget and timeout retained',opts.maxTokens===(mode==='pro'?6000:1800)&&opts.timeoutMs===(mode==='pro'?75000:35000));
 }
 const E=require(path.join(root,'v5/engine')),KB=require(path.join(root,'v5/kb-direct'));
 const state=E.apply(E.state(),{type:'text',text:'I am going to Hong Kong',channel:'text'});
 record('five-city state available without overwriting unknown cities',state.facts.city==='Hong Kong'&&require(path.join(root,'v5/city-scope')).canonical('Tokyo')==='Tokyo');
 record('unregistered questions retain generation fallback',!KB.lookup('Please compare hotels near my destination and explain the trade-offs.').matched);
 record('extra request cannot be swallowed by exact KB',!KB.lookup(KB.entries[0].languageIndependentAliases[0]+' Also explain my visa eligibility.').matched);
} catch(error) { record('audit execution',false,{error:error.message}); }
const report={baseline:BASE,checkedCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),checkedAt:new Date().toISOString(),checks,passed:checks.filter(x=>x.passed).length,total:checks.length,scope:'Literal prompt and module preservation plus controlled routing contracts. Not a claim of unchanged real-model quality, latency, voice acoustics or supplier integration. No paid calls.'};
const out=path.join(root,'evidence/v6.5/prompt-preservation.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(checks.some(x=>!x.passed))process.exitCode=1;
