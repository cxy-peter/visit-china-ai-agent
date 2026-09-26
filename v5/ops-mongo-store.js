'use strict';
// Mongo is explicitly selected; failures never silently create a second authority.
function createMongoStore(env,prune,Client){
 if(!env.MONGODB_URI)throw Error('MONGODB_URI_REQUIRED');
 const MongoClient=Client||require('mongodb').MongoClient;
 const client=new MongoClient(env.MONGODB_URI,{serverSelectionTimeoutMS:5000,maxPoolSize:3});
 const col=client.db(env.MONGODB_DB||'visit_china').collection('operations_state');
 return {kind:'mongo',async read(){return (await col.findOne({_id:'v1'}))?.value||null;},async mutate(fn){
  if(env.OPS_STORE_READ_ONLY==='1')throw Error('STORE_READ_ONLY_MIGRATION');
  for(let n=0;n<6;n++){
   const old=await col.findOne({_id:'v1'}),value=prune(old?.value||require('./operations').initial()),result=fn(value);value.revision++;
   const body=JSON.stringify(value);if(Buffer.byteLength(body)>8_000_000)throw Error('STORE_LIMIT_ARCHIVE_REQUIRED');
   const row={_id:'v1',revision:value.revision,value};
   if(!old){try{await col.insertOne(row);return result;}catch(e){if(e.code===11000)continue;throw e;}}
   const changed=await col.replaceOne({_id:'v1',revision:old.revision},row);
   if(changed.modifiedCount===1)return result;
  }
  throw Error('STORE_CONFLICT');
 },close:()=>client.close()};
}
module.exports={createMongoStore};
