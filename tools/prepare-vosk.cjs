'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function prepareVosk(){
 const root=path.join(__dirname,'..'),dir=path.join(root,'runtime','voice-models'),out=path.join(dir,'vosk.js'),workerPath=path.join(dir,'vosk-worker.js');
 const source=fs.readFileSync(path.join(root,'node_modules/vosk-browser/dist/vosk.js'),'utf8');
 const fingerprint=crypto.createHash('sha256').update(source+'external-worker-v1').digest('hex');
 const stamp=out+'.sha256';if(fs.existsSync(out)&&fs.existsSync(workerPath)&&fs.existsSync(stamp)&&fs.readFileSync(stamp,'utf8')===fingerprint)return out;
 const packed=/var WorkerFactory = createBase64WorkerFactory\('([A-Za-z0-9+/=]+)', null, false\);/.exec(source);
 if(!packed)throw Error('VOSK_WORKER_FORMAT_CHANGED');
 // Unmodified upstream worker, separately served: Emscripten bindings may use
 // dynamic code here without granting unsafe-eval to the page or its DOM.
 const worker=Buffer.from(packed[1],'base64');
 const bundle=source.replace(packed[0],'var WorkerFactory = function(options){return new Worker(new URL("vosk-worker.js",document.baseURI),options);};');
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(workerPath,worker);fs.writeFileSync(out,bundle);fs.writeFileSync(stamp,fingerprint);return out;
};
if(require.main===module)console.log(module.exports());
