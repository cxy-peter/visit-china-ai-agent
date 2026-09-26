'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./demo-accounts'),A=require('./admin-login-config'),{auth}=require('./ops-auth');
const env=()=>({VERCEL:'1',OPS_PUBLIC_DEMO_ACCOUNTS:'1',OPS_SESSION_SECRET:'test-demo-account-signing-secret-32',OPS_USERS_JSON:JSON.stringify(D.provision())});
test('advertised six demo accounts match actual password hashes and roles',()=>{
 const e=env(),identities=auth(e),rows=D.configured(e);assert.equal(rows.length,6);assert.equal(identities.reviewers.size,5);
 for(const a of rows){assert.equal(identities.login(a.username,a.password).role,a.role);assert.equal(identities.login(a.username,a.password+'wrong'),null);}
 assert.equal(identities.login('unknown','demo2026'),null);
 const info=A.info({}, {env:e,original:e});assert.equal(info.publicDemo,true);assert.equal(info.prefill.password,'demo2026');assert.deepEqual(info.accounts,rows);
 assert.ok(!JSON.stringify(info).includes(e.OPS_SESSION_SECRET));assert.ok(!JSON.stringify(info).includes('hash'));
});
test('no automatic password fallback or exposure on custom production installations',()=>{
 const e=env();delete e.OPS_PUBLIC_DEMO_ACCOUNTS;assert.deepEqual(D.configured(e),[]);
 const users=JSON.parse(e.OPS_USERS_JSON);users.admin.hash='0'.repeat(64);e.OPS_USERS_JSON=JSON.stringify(users);e.OPS_PUBLIC_DEMO_ACCOUNTS='1';
 assert.ok(!D.configured(e).some(a=>a.username==='admin'));assert.equal(auth(e).login('admin','demo2026'),null);
 for(const OPS_USERS_JSON of ['{invalid','{}'])assert.deepEqual(D.configured({...e,OPS_USERS_JSON}),[]);
 assert.deepEqual(D.configured({...e,OPS_SESSION_SECRET:''}),[]);
});
