/* Helpful login defaults are server-confirmed, never a public password fallback. */
(function(){'use strict';
const fields=[['ops-login-form','ops-user','ops-password','local'],['ops-cloud-login','username','password','operations'],['chat-admin-login','chat-admin-username','chat-admin-password','operations']];
function field(form,name){return form.elements.namedItem(name)||form.querySelector('#'+name);}
async function enhance(form,u,p,realm){
 if(form.dataset.loginEnhanced)return;form.dataset.loginEnhanced='true';
 const username=field(form,u),password=field(form,p);if(!username||!password)return;
 const initialUser=username.value,initialPassword=password.value;let touched=false;
 for(const input of [username,password])input.addEventListener('input',()=>{touched=true;});
 const note=document.createElement('p');note.className='muted';note.dataset.loginHint='true';note.setAttribute('role','status');note.textContent='正在确认登录方式…';form.append(note);
 form.addEventListener('submit',()=>{username.value=username.value.trim();},true);
 const reveal=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.dataset.showLoginPassword='true';reveal.append(toggle,document.createTextNode(' 显示密码'));form.append(reveal);
 toggle.onchange=()=>{password.type=toggle.checked?'text':'password';};
 if(location.protocol==='file:'){note.textContent='这是单文件预览，没有登录后端。请运行 npm start，再从本机地址打开；这里不会假装登录成功。';return;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
 try{const response=await fetch('/api/admin-login-info?realm='+realm,{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('LOGIN_INFO_UNAVAILABLE');const value=await response.json();
  if(!form.isConnected)return;
  if(!touched&&username.value===initialUser&&!username.value)username.value=value.prefill?.username||'admin';
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  if(local&&value.localDemo===true&&!touched&&password.value===initialPassword&&!password.value&&value.prefill?.password==='demo2026')password.value=value.prefill.password;
  note.textContent=value.message||'请输入当前服务端配置的账号。';form.dataset.authConfigured=String(value.configured===true);
 }catch(_){if(form.isConnected)note.textContent='未取得登录配置。检查本机服务是否已更新并启动；线上站点请使用实际 Operations 账号，不能用模型 API Key 登录。';}
 finally{clearTimeout(timer);}
}
function scan(){for(const [id,u,p,realm] of fields){const form=document.getElementById(id);if(form)enhance(form,u,p,realm);}}
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});scan();
})();
