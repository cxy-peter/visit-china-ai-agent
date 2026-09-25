'use strict';
// Hosted helper only reports non-secret status. It can never provision local defaults.
module.exports=(req,res)=>require('../v5/admin-login-config').respond(req,res,{env:process.env,original:{...process.env,VERCEL:'1'},generated:false});
