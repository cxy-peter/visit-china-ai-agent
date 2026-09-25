'use strict';
const crypto=require('node:crypto');
const E=require('./engine');
const clone=x=>JSON.parse(JSON.stringify(x));
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
const digest=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
const now=()=>new Date().toISOString();
function validateConfig(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('CONFIG_OBJECT');
 const keys=['maxSpokenChars','questionOrder','proactiveExtensions','promptSuffix'];
 if(Object.keys(x).some(k=>!keys.includes(k)))throw Error('UNSAFE_CONFIG_FIELD');
 if(!Number.isInteger(x.maxSpokenChars)||x.maxSpokenChars<100||x.maxSpokenChars>360)throw Error('SPEECH_LENGTH');
 if(!Array.isArray(x.questionOrder)||x.questionOrder.length!==5||new Set(x.questionOrder).size!==5||x.questionOrder.some(k=>!E.BASE.questionOrder.includes(k)))throw Error('QUESTION_ORDER');
 if(typeof x.proactiveExtensions!=='boolean')throw Error('EXTENSION_FLAG');
 if(typeof x.promptSuffix!=='string'||x.promptSuffix.length>450||/https?:|<|>|ignore.{0,25}(instruction|safety|policy)|bypass|override|api.?key|password|验证码|忽略.*规则/i.test(x.promptSuffix))throw Error('UNSAFE_PROMPT');
 return clone(x);
}
function configOf(p){const {version,...config}=p;return validateConfig(config);}
function newStore(){return{schema:5,active:{...clone(E.BASE)},counter:1,candidates:[],feedback:[],audit:[]};}
function log(store,type,actor,detail={}){store.audit.push({id:crypto.randomUUID(),at:now(),type,actor,...detail});store.audit=store.audit.slice(-2000);}
function feedback(store,actor,input){if(!['too_long','repeated_question','irrelevant_extension','missed_requirement','other'].includes(input.category))throw Error('FEEDBACK_CATEGORY');const key=String(input.key||'').slice(0,180);if(!key)throw Error('FEEDBACK_KEY');const existing=store.feedback.find(x=>x.owner===actor&&x.key===key);if(existing)return existing;const row={id:crypto.randomUUID(),owner:actor,key,category:input.category,note:E.clean(input.note,500),at:now()};store.feedback.push(row);store.feedback=store.feedback.slice(-500);return row;}
function candidate(store,actor,config,rationale,mode='manual',feedbackIds=[]){if(store.candidates.length>=200)throw Error('CANDIDATE_CAPACITY');config=validateConfig(config);const row={id:crypto.randomUUID(),author:actor,baseVersion:store.active.version,config,explanation:E.clean(rationale,700),mode,feedbackIds:feedbackIds.filter(id=>store.feedback.some(f=>f.id===id)),revision:1,createdAt:now(),votes:[],evaluation:null,status:'draft'};row.hash=digest({baseVersion:row.baseVersion,config:row.config,revision:row.revision});store.candidates.push(row);log(store,'candidate_created',actor,{id:row.id,hash:row.hash,mode});return row;}
function get(store,id){const row=store.candidates.find(x=>x.id===id);if(!row)throw Error('CANDIDATE_NOT_FOUND');return row;}
function edit(store,id,actor,config,isAdmin=actor==='admin'){const row=get(store,id);if(['published','rolled_back'].includes(row.status))throw Error('IMMUTABLE_RELEASE');if(row.author!==actor&&!isAdmin)throw Error('AUTHOR_REQUIRED');row.config=validateConfig(config);row.baseVersion=store.active.version;row.revision++;row.votes=[];row.evaluation=null;row.status='draft';row.hash=digest({baseVersion:row.baseVersion,config:row.config,revision:row.revision});log(store,'candidate_revised_approvals_reset',actor,{id,hash:row.hash});return row;}
function evaluateConfig(config){config=validateConfig(config);const policy={version:'candidate',...config},checks=[];
 function test(name,fn){let passed=false,detail='';try{passed=!!fn();}catch(e){detail=e.message;}checks.push({name,passed,detail});}
 const apply=arr=>arr.reduce((s,text)=>E.apply(s,{type:'text',text}),E.state(policy));
 test('known facts are retained',()=>{const s=apply(['My flight to Shanghai is booked.','I am travelling with my parents.']);return s.facts.city==='Shanghai'&&s.facts.flight==='booked'&&s.facts.party==='with parents';});
 test('negative hotel does not become a booking',()=>apply(['I booked my flight to Shanghai but have not booked my hotel.']).facts.hotel==='not_booked');
 test('click during audio uses normal state transition',()=>{let s=E.state(policy);s=E.apply(s,{type:'choice',id:'city-sh',channel:'click'});return s.facts.city==='Shanghai'&&s.revision===1;});
 test('low power suppresses extensions',()=>{const r=E.reply(apply(['Shanghai. My hotel is booked. Battery 3%.']));return r.urgent&&r.suggestions.length===0;});
 test('offline is not a power-bank recommendation',()=>E.reply(apply(['Shanghai, no internet, battery 80%.'])).question==='connection');
 test('confirmed task list invalidated by changes',()=>{let s=apply(['Shanghai']);s=E.apply(s,{type:'confirm'});s=E.apply(s,{type:'text',text:'Actually Beijing'});return s.confirmedRevision===null;});
 test('city correction clears old airport',()=>{const s=apply(['PVG T2 public arrivals','Actually I am going to Beijing']);return s.facts.city==='Beijing'&&!s.facts.airport&&!s.facts.terminal;});
 test('no booking is executed',()=>E.reply(apply(['Shanghai. I need a hotel.'])).plan.every(x=>x.status==='suggested'));
 test('speech is bounded',()=>E.reply(apply(['Shanghai'])).spoken.length<=config.maxSpokenChars);
 test('policy facts are not editable parameters',()=>{try{validateConfig({...config,feePercent:0});return false;}catch(_){return true;}});
 return{at:now(),passed:checks.every(c=>c.passed),checks,scope:'Self-authored deterministic safety/regression fixtures; NOT model or real-user quality.'};
}
function evaluate(store,id,actor){const row=get(store,id);if(['published','rolled_back'].includes(row.status))throw Error('IMMUTABLE_RELEASE');row.evaluation={...evaluateConfig(row.config),hash:row.hash};row.votes=[];row.status=row.evaluation.passed?'review':'failed';log(store,'evaluated_votes_reset',actor,{id,hash:row.hash,passed:row.evaluation.passed});return row;}
function vote(store,id,actor,decision,hash,allowedReviewers){const row=get(store,id);if(!allowedReviewers.has(actor))throw Error('REVIEWER_REQUIRED');if(row.author===actor)throw Error('AUTHOR_CANNOT_APPROVE');if(!['approve','reject','withdraw'].includes(decision))throw Error('VOTE_VALUE');if(row.hash!==hash)throw Error('STALE_HASH');if(!['review','blocked'].includes(row.status))throw Error('NOT_IN_REVIEW');if(row.baseVersion!==store.active.version)throw Error('STALE_BASE');if(!row.evaluation?.passed||row.evaluation.hash!==row.hash)throw Error('EVALUATION_REQUIRED');
 row.votes=row.votes.filter(v=>v.reviewer!==actor);if(decision!=='withdraw')row.votes.push({reviewer:actor,decision,hash:row.hash,at:now()});
 row.status=row.votes.some(v=>v.decision==='reject')?'blocked':'review';log(store,'vote',actor,{id,hash:row.hash,decision});
 const approvals=new Set(row.votes.filter(v=>v.decision==='approve'&&v.hash===row.hash&&allowedReviewers.has(v.reviewer)&&v.reviewer!==row.author).map(v=>v.reviewer));
 if(row.status==='review'&&approvals.size>=5){row.previous=clone(store.active);store.counter++;store.active={version:'wf-'+store.counter,...clone(row.config)};row.publishedVersion=store.active.version;row.status='published';row.publishedAt=now();log(store,'published_after_five_distinct_approvals',actor,{id,hash:row.hash,version:store.active.version,approvals:[...approvals]});}
 return row;
}
function rollback(store,id,actor,isAdmin=actor==='admin'){if(!isAdmin)throw Error('ADMIN_REQUIRED');const row=get(store,id);if(row.status!=='published'||store.active.version!==row.publishedVersion)throw Error('ROLLBACK_NOT_CURRENT');store.counter++;store.active={...clone(row.previous),version:'wf-'+store.counter};row.status='rolled_back';log(store,'rollback',actor,{id,version:store.active.version,restoredFrom:row.previous.version});return store.active;}
function template(store,category){const p=configOf(store.active);if(category==='too_long')p.maxSpokenChars=Math.max(100,p.maxSpokenChars-40);if(category==='irrelevant_extension')p.proactiveExtensions=false;if(category==='repeated_question')p.questionOrder=['stage','hotel','flight','transfer','interests'];p.promptSuffix='Ask one relevant unanswered question. Reuse known preferences. Accept speech or clicks immediately; summarize without repeating every field.';return p;}
module.exports={canonical,digest,validateConfig,configOf,newStore,feedback,candidate,edit,evaluateConfig,evaluate,vote,rollback,template};
