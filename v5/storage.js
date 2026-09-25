'use strict';
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');
const G=require('./governance');
// One local, durable SQLite volume. BEGIN IMMEDIATE serializes writers across
// processes; do not put this file on a network filesystem or ephemeral hosting.
class Storage {
 constructor(dir){
  this.db=new DatabaseSync(path.join(dir,'visit-china.sqlite'));
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  this.db.exec(`CREATE TABLE IF NOT EXISTS governance(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires INTEGER NOT NULL, value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS votes(candidate TEXT NOT NULL, hash TEXT NOT NULL, reviewer TEXT NOT NULL, decision TEXT NOT NULL, PRIMARY KEY(candidate,reviewer));
   CREATE TABLE IF NOT EXISTS operations(actor TEXT NOT NULL, key TEXT NOT NULL, digest TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(actor,key));
   CREATE TABLE IF NOT EXISTS media(room TEXT PRIMARY KEY, session TEXT NOT NULL);`);
  const legacy=path.join(dir,'governance-v5.json');
  this.transaction(()=>{if(!this.db.prepare('SELECT id FROM governance WHERE id=1').get()){
   const initial=fs.existsSync(legacy)?JSON.parse(fs.readFileSync(legacy,'utf8')):G.newStore();G.configOf(initial.active);this.writeGovernance(initial);
  }});
 }
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const out=fn();if(out?.then)throw Error('ASYNC_TRANSACTION_FORBIDDEN');this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 readGovernance(){return JSON.parse(this.db.prepare('SELECT value FROM governance WHERE id=1').get().value);}
 writeGovernance(store){
  this.db.prepare('INSERT INTO governance VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(store));
  this.db.exec('DELETE FROM votes');const insert=this.db.prepare('INSERT INTO votes VALUES(?,?,?,?)');
  for(const c of store.candidates)for(const v of c.votes)insert.run(c.id,v.hash,v.reviewer,v.decision);
 }
 mutate(actor,key,payload,fn){return this.transaction(()=>{
  if(key!==undefined&&(typeof key!=='string'||!key.length||key.length>100))throw Error('REQUEST_ID');
  const digest=G.digest(payload);
  if(key){const old=this.db.prepare('SELECT digest,value FROM operations WHERE actor=? AND key=?').get(actor,key);if(old){if(old.digest!==digest)throw Error('IDEMPOTENCY_CONFLICT');return JSON.parse(old.value);}}
  const store=this.readGovernance(),result=fn(store);this.writeGovernance(store);
  if(key)this.db.prepare('INSERT INTO operations VALUES(?,?,?,?)').run(actor,key,digest,JSON.stringify(result));
  return result;
 });}
 readSession(id){const row=this.db.prepare('SELECT value FROM sessions WHERE id=? AND expires>?').get(id,Date.now());return row?JSON.parse(row.value):null;}
 writeSession(s){
  const {controller,guideController,requestIds,...value}=s;
  value.requests=[...(requestIds||new Map(value.requests||[]))];
  this.db.prepare('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires,value=excluded.value').run(s.id,s.until,JSON.stringify(value));
 }
 changeSession(s,fn){return this.transaction(()=>{const saved=this.readSession(s.id);if(saved)Object.assign(s,saved,{requestIds:new Map(saved.requests||[])});const result=fn(s);this.writeSession(s);return result;});}
 rotate(old,s){this.transaction(()=>{this.db.prepare('DELETE FROM sessions WHERE id=?').run(old);this.db.prepare('UPDATE media SET session=? WHERE session=?').run(s.id,old);this.writeSession(s);});}
 mediaSession(room){const row=this.db.prepare('SELECT session FROM media WHERE room=?').get(room);return row?this.readSession(row.session):null;}
 bindMedia(room,s){this.db.prepare('INSERT INTO media VALUES(?,?) ON CONFLICT(room) DO UPDATE SET session=excluded.session').run(room,s.id);}
 cleanup(){this.db.prepare('DELETE FROM media WHERE session IN (SELECT id FROM sessions WHERE expires<=?)').run(Date.now());this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());}
 close(){this.db.close();}
}
module.exports={Storage};
