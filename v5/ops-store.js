'use strict';
// Low-volume prototype storage. Conditional writes prevent lost approvals/events.
const path=require('node:path'),fs=require('node:fs');
function prune(value){const now=Date.now();if(value.feedbackCases)value.feedbackCases=value.feedbackCases.filter(r=>now-r.createdAt<30*86400000).slice(-200);if(value.failures)value.failures=value.failures.filter(r=>now-r.at<30*86400000).slice(-500);return value;}
function createStore(env=process.env,sdkOverride){
 if(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN){
  const sdk=sdkOverride||require('@vercel/blob'),name='operations/state-v1.json';
  // Compressed responses carry W/ ETags, which cannot authorize a strong If-Match write.
  // Request the identity representation so the version belongs to the bytes being updated.
  async function read(){const r=await sdk.get(name,{access:'private',useCache:false,headers:{'accept-encoding':'identity'}});if(!r)return{value:null,etag:null};if(r.statusCode!==200)throw Error('STORE_UNAVAILABLE');if(!r.blob.etag||r.blob.etag.startsWith('W/'))throw Error('STORE_STRONG_VERSION_REQUIRED');return{value:JSON.parse(await new Response(r.stream).text()),etag:r.blob.etag};}
  return{kind:'private-blob',read:async()=> (await read()).value,async mutate(fn){
   for(let n=0;n<6;n++){const old=await read(),value=prune(old.value||require('./operations').initial());const result=fn(value);value.revision++;
    try{await sdk.put(name,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:Boolean(old.etag),...(old.etag?{ifMatch:old.etag}:{}),contentType:'application/json',cacheControlMaxAge:0});return result;}
    catch(e){if(!/Precondition|AlreadyExists/.test(e.constructor.name))throw e;}
   }throw Error('STORE_CONFLICT');
  }};
 }
 if(env.VERCEL)throw Error('DURABLE_STORE_NOT_CONFIGURED');
 const {DatabaseSync}=require('node:sqlite'),dir=env.LOCAL_DATA_DIR||path.join(__dirname,'../runtime/operations');fs.mkdirSync(dir,{recursive:true});const db=new DatabaseSync(path.join(dir,'operations.sqlite'));db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
 const read=()=>{const row=db.prepare('SELECT value FROM state WHERE id=1').get();return row?JSON.parse(row.value):null;};
 return{kind:'local-sqlite',read:async()=>read(),async mutate(fn){db.exec('BEGIN IMMEDIATE');try{const value=prune(read()||require('./operations').initial()),result=fn(value);value.revision++;db.prepare('INSERT INTO state(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(value));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},close:()=>db.close()};
}
module.exports={createStore};
