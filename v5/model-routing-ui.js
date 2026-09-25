(function(){'use strict';
let selected='auto';try{const saved=localStorage.getItem('vc-model-mode');if(['auto','flash','pro'].includes(saved))selected=saved;}catch(_){}
const settings=document.getElementById('shared-model-dialog'),row=document.createElement('label');row.className='model-mode-picker';row.innerHTML='<span>回答模式 / Answer mode</span><select id="model-mode"><option value="auto">自动 · 按问题复杂度选择 / Auto</option><option value="flash">Flash · 快速回答 / Fast</option><option value="pro">Pro · 条件分析与路线规划 / Deliberate</option></select><small>Pro 通常更慢、费用更高。生成期间可以继续补充；助手会结合新增内容重新整理答案。</small>';settings.querySelector('.compose-settings').before(row);
const input=document.getElementById('model-mode');input.value=selected;input.onchange=()=>{selected=input.value;try{localStorage.setItem('vc-model-mode',selected);}catch(_){}};
window.TravelModelRoutingUI={mode:()=>selected};
})();
