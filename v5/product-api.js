/** Same-origin, read-only mock provider contract. No outbound requests or keys. */
'use strict';
const P=require('./product-suggestions');
function createProducts(){return async(req,res)=>{const json=(status,out)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(out));};try{
 if(req.method!=='POST')return json(405,{error:'POST_REQUIRED'});
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'ORIGIN_NOT_ALLOWED'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(415,{error:'JSON_REQUIRED'});
 let text;if(req.body!==undefined)text=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{let size=0,parts=[];for await(const p of req){size+=p.length;if(size>12000)return json(413,{error:'BODY_TOO_LARGE'});parts.push(p);}text=Buffer.concat(parts).toString('utf8');}
 if(Buffer.byteLength(text)>12000)return json(413,{error:'BODY_TOO_LARGE'});
 return json(200,P.prepare(JSON.parse(text)));
 }catch(e){return json(400,{error:/^[A-Z_]+$/.test(e.message)?e.message:'PRODUCT_REQUEST_INVALID'});}};}
module.exports={createProducts};
