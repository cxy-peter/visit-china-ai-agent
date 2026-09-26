'use strict';
const {createCloudChat}=require('../v5/cloud-chat');
// Hosted chat shares authenticated Operations accounts by default.
// Public chat remains an explicit opt-in with TRAVEL_CHAT_PUBLIC=1.
module.exports=createCloudChat({env:{...process.env,TRAVEL_CHAT_PUBLIC:process.env.TRAVEL_CHAT_PUBLIC??'0'}});
