'use strict';
// Run on your own machine. Passwords are generated here; never committed or put in browser code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../data/runtime');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const file=path.join(dir,'reviewers.local.json');if(fs.existsSync(file))throw Error('Reviewer registry already exists. No credentials overwritten.');
const names=process.argv.slice(2);if(names.length<5||new Set(names).size!==names.length||names.some(x=>x==='admin'||!/^\w[\w.-]{0,40}$/.test(x)))throw Error('Provide at least five different reviewer usernames (not admin).');
const rows={};for(const name of names){const password=crypto.randomBytes(15).toString('base64url'),salt=crypto.randomBytes(16).toString('hex');rows[name]={salt,hash:crypto.scryptSync(password,salt,32).toString('hex')};console.log(name+'  '+password);}
fs.writeFileSync(file,JSON.stringify(rows,null,2),{mode:0o600});console.log('Private reviewer registry created. Give each credential to its designated reviewer and restart Node. Do not upload this file.');
