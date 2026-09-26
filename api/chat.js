'use strict';
const {createCloudChat}=require('../v5/cloud-chat');
// Public travel chat is the hosted product default. Operations keeps its own authentication.
// Set TRAVEL_CHAT_PUBLIC=0 to restore the private administrator / experience-code flow.
module.exports=createCloudChat({env:{...process.env,TRAVEL_CHAT_PUBLIC:process.env.TRAVEL_CHAT_PUBLIC??'1'}});
