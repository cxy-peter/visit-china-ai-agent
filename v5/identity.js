'use strict';
const crypto=require('node:crypto');
function identity(issuer,sub){return 'oidc:'+crypto.createHash('sha256').update(JSON.stringify([issuer,sub])).digest('hex');}
function createIdentity(env){
 const enabled=Boolean(env.OIDC_ISSUER),issuer=env.OIDC_ISSUER;
 const subjects=name=>{const a=JSON.parse(env[name]||'[]');if(!Array.isArray(a)||a.some(x=>typeof x!=='string'||!x))throw Error('OIDC_SUBJECT_LIST');return new Set(a.map(x=>identity(issuer,x)));};
 const reviewers=subjects('OIDC_REVIEWER_SUBJECTS'),admins=subjects('OIDC_ADMIN_SUBJECTS');
 let config;
 const load=async()=>{const oidc=await import('openid-client');if(!config)config=await oidc.discovery(new URL(issuer),env.OIDC_CLIENT_ID,env.OIDC_CLIENT_SECRET);return {oidc,config};};
 if(enabled){for(const name of ['OIDC_CLIENT_ID','OIDC_REDIRECT_URI'])if(!env[name])throw Error(name+'_REQUIRED');if(!issuer.startsWith('https://')||!env.OIDC_REDIRECT_URI.startsWith('https://'))throw Error('OIDC_HTTPS_REQUIRED');}
 return {enabled,reviewers,admins,
  async begin(){const {oidc,config}=await load(),verifier=oidc.randomPKCECodeVerifier(),state=oidc.randomState(),nonce=oidc.randomNonce();
   const url=oidc.buildAuthorizationUrl(config,{redirect_uri:env.OIDC_REDIRECT_URI,scope:'openid',code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',state,nonce});
   return {url:url.href,pending:{verifier,state,nonce,until:Date.now()+300000}};
  },
  async finish(query,pending){if(!pending||pending.until<Date.now())throw Error('SSO_LOGIN_EXPIRED');const {oidc,config}=await load();
   const url=new URL(env.OIDC_REDIRECT_URI);url.search=query;
   const tokens=await oidc.authorizationCodeGrant(config,url,{pkceCodeVerifier:pending.verifier,expectedState:pending.state,expectedNonce:pending.nonce,idTokenExpected:true});
   const claims=tokens.claims();if(!claims?.sub)throw Error('SSO_SUBJECT_REQUIRED');const actor=identity(issuer,claims.sub);
   if(!reviewers.has(actor)&&!admins.has(actor))throw Error('ORGANIZATION_MEMBERSHIP_REQUIRED');return actor;
  }
 };
}
module.exports={createIdentity,identity};
