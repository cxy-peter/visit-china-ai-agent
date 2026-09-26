'use strict';
// Credentials come only from server environment. Output never contains payload/URI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const counts=v=>Object.fromEntries(Object.entries(v).filter(([,x])=>x&&typeof x==='object').map(([k,x])=>[k,Object.keys(x).length]));
async function main(action,file){
 if(!['export','import','verify'].includes(action)||!file)throw Error('USAGE: export|import|verify private/backup.json');
 if(action==='export'){
  if(process.env.OPS_STORE_READ_ONLY!=='1')throw Error('FREEZE_PRODUCTION_WRITES_FIRST');
  const store=require('../v5/ops-store').createStore();
  try{const value=await store.read();if(!value)throw Error('EMPTY_SOURCE');const out={format:'visit-china-private-v1',sha256:hash(value),counts:counts(value),value};fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(out),{flag:'wx',mode:0o600});console.log({sha256:out.sha256,counts:out.counts});}finally{await store.close?.();}
  return;
 }
 const backup=JSON.parse(fs.readFileSync(file,'utf8')),value=backup.value;
 if(backup.format!=='visit-china-private-v1'||backup.sha256!==hash(value)||hash(backup.counts)!==hash(counts(value))||!Number.isSafeInteger(value.revision))throw Error('BACKUP_INVALID');
 if(Buffer.byteLength(JSON.stringify(value))>8_000_000)throw Error('STORE_LIMIT');
 const {MongoClient}=require('mongodb'),db=process.env.MONGODB_DB||'visit_china';if(db!=='visit_china')throw Error('WRONG_DATABASE');
 const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});
 try{const col=client.db(db).collection('operations_state');if(action==='import')await col.insertOne({_id:'v1',revision:value.revision,value});const row=await col.findOne({_id:'v1'});if(!row||hash(row.value)!==backup.sha256||hash(counts(row.value))!==hash(backup.counts))throw Error('TARGET_MISMATCH');console.log({verified:true,database:db,sha256:backup.sha256,counts:backup.counts});}finally{await client.close();}
}
if(require.main===module)main(...process.argv.slice(2)).catch(e=>{console.error('Migration failed:',e.constructor.name,'Source retained; configuration not changed.');process.exitCode=1;});
module.exports={hash,counts};
