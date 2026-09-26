'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
function loadCorpus(){const file=path.join(__dirname,'../data/evaluation/v6.1-cases.json');return JSON.parse(fs.existsSync(file)?fs.readFileSync(file,'utf8'):zlib.gunzipSync(fs.readFileSync(file+'.gz')).toString('utf8'));}
module.exports={loadCorpus};
