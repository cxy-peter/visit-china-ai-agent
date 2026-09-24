'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
let records=[];const f=path.join(root,'data/official/records.json');if(fs.existsSync(f))records=JSON.parse(fs.readFileSync(f,'utf8'));
const corpus='window.ArrivalCorpus='+JSON.stringify(records).replace(/</g,'\\u003c')+';';
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const name of ['index.html','style.css','app.js','core.js','data.js'])fs.copyFileSync(path.join(__dirname,name),path.join(out,name));
fs.writeFileSync(path.join(out,'corpus.js'),corpus);
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+fs.readFileSync(path.join(__dirname,'style.css'),'utf8')+'</style>');
for(const name of ['data','core','corpus','app']){const js=name==='corpus'?corpus:fs.readFileSync(path.join(__dirname,name+'.js'),'utf8');if(/<\/script/i.test(js))throw Error('Unsafe inline script boundary: '+name);html=html.replace('<script src="'+name+'.js"></script>','<script>'+js+'</script>');}
fs.writeFileSync(path.join(out,'Visit_China_AI_V4_Demo.html'),html);
const manifest={version:'4.0.0',builtAt:new Date().toISOString(),officialIndexPages:records.length,corpusSha256:crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex'),mode:'Static frontend; real DeepSeek and official fetch require the Node backend',files:{}};
for(const name of ['index.html','style.css','app.js','core.js','data.js','corpus.js','Visit_China_AI_V4_Demo.html'])manifest.files[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({built:true,officialIndexPages:records.length,standalone:'dist/Visit_China_AI_V4_Demo.html'}));
