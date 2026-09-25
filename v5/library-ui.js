/* The original library's search/cards/detail layout, inside the active conversation workspace. */
(function(){'use strict';
const L=TravelLibrary,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let page=0,detail=null;const pageSize=18;
function view(library){$('travel-workspace').classList.toggle('hidden',library);$('library-workspace').classList.toggle('hidden',!library);$('nav-library').classList.toggle('selected',library);$('nav-call').classList.toggle('selected',!library);$('workspace-heading').textContent=library?'每一步，都能回到原始依据。':'聊聊你的下一段旅程。';if(library){render();$('library-query').focus({preventScroll:true});}else $('message').focus({preventScroll:true});}
function render(){
 const state=TravelApp.getState();
 $('library-context').textContent=(state.initialRequest?.text||'尚未开始行程 · 可先查资料，再回到对话')+' · '+state.history.length+' 轮对话';
 $('source-selection').innerHTML='<button id="browse-sources-inline" class="light">▧ 自动检索资料 · 查阅来源 / Sources</button>';
 if($('library-workspace').classList.contains('hidden'))return;
 const rows=L.search($('library-query').value,$('library-city').value,$('library-kind').value);page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));
 $('library-count').textContent=L.indexCount.toLocaleString()+' 条官网索引';$('library-summary-count').textContent=L.records.filter(r=>r.summary||r.summaryZh).length+' 条摘要（含站点与去处）';
 $('library-results-count').textContent=rows.length+' 条结果 · 第 '+(page+1)+' / '+Math.max(1,Math.ceil(rows.length/pageSize))+' 页';
 $('library-results').innerHTML=rows.slice(page*pageSize,(page+1)*pageSize).map(r=>'<article class="source-card"><div class="source-type">'+esc(r.publisher)+' · '+esc(r.city||'通用')+'</div><h3><button data-source-detail="'+esc(r.id)+'">'+esc(r.title)+'</button></h3><p>'+esc(L.summary(r,state.language).slice(0,150))+'</p><div class="source-card-foot"><span>证据 '+TravelConfidence.source(r).score+'/100 · '+esc(L.label(r,state.language))+'</span><span>'+((TravelConfidence.source(r).score>60&&L.current(r))?'自动检索':'需核验 / 仅索引')+'</span></div></article>').join('')||'<p class="empty">暂无匹配资料。可换用城市、地铁 / metro、支付 / payment 等关键词。</p>';
 $('library-prev').disabled=page===0;$('library-next').disabled=(page+1)*pageSize>=rows.length;
 if(detail)showDetail(detail,false);
}
function showDetail(id,focus=true){const r=L.get(id);if(!r)return;detail=id;const state=TravelApp.getState();
 $('source-detail').innerHTML='<div class="section-title">SOURCE DETAILS · 来源详情</div><h2>'+esc(r.title)+'</h2><span class="source-status">'+esc(L.label(r,state.language))+'</span><p class="source-body">'+esc(L.summary(r,state.language))+'</p><dl><dt>资料证据评分 / Evidence score</dt><dd>'+TravelConfidence.source(r).score+'/100 · '+esc(TravelConfidence.source(r).reasons.join('；'))+'（不是正确概率）</dd><dt>发布方 / Publisher</dt><dd>'+esc(r.publisher)+'</dd><dt>发布时间 / Published</dt><dd>'+esc(r.published||r.publication_date||'请见原文')+'</dd><dt>摘要复核 / Editorial review</dt><dd>'+esc(r.reviewedAt||'未人工核对')+'</dd><dt>原文自动检查 / Page check</dt><dd>'+esc(r.lastCheck?.status||'尚无检查')+' · '+esc(r.lastCheck?.at||'')+'</dd><dt>索引采集 / Indexed</dt><dd>'+esc(r.retrieved_at||'精选资料')+'</dd><dt>范围 / Scope</dt><dd>'+esc(r.city||'通用')+' · '+esc((r.topics||[]).join(' / '))+'</dd></dl><p class="muted">自动抓取不等于政策核验。摘要可能过期；适用条件、当前收费与供应情况请以原文或运营方为准。</p><div class="source-detail-actions"><a class="outline" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">查看官方原文 ↗</a><button class="primary" data-return-chat>返回对话 / Back to chat</button></div>';
 if(focus){$('source-detail').focus({preventScroll:true});if(innerWidth<961)$('source-detail').scrollIntoView({behavior:'smooth',block:'start'});}
}
function openDetail(id){view(true);showDetail(id);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-source-detail],[data-return-chat],#browse-sources-inline');if(!b)return;if(b.dataset.sourceDetail)return openDetail(b.dataset.sourceDetail);view(!b.hasAttribute('data-return-chat'));});
 $('library-hangup').onclick=()=>$('hangup').click();$('nav-library').onclick=()=>view(true);$('nav-call').onclick=()=>view(false);$('library-back').onclick=()=>view(false);
 $('library-search').onsubmit=e=>{e.preventDefault();page=0;render();};for(const id of ['library-city','library-kind'])$(id).onchange=()=>{page=0;render();};
 $('library-prev').onclick=()=>{page--;render();};$('library-next').onclick=()=>{page++;render();};
 $('shared-model-open').onclick=()=>{$('shared-model-dialog').showModal();TravelApp.refreshModel();};$('shared-model-close').onclick=()=>$('shared-model-dialog').close();
 $('model-settings-open').onclick=()=>{$('shared-model-dialog').close();$('nav-ops').click();};
 $('shared-model-consent').onchange=()=>{$('model-consent').checked=$('shared-model-consent').checked;$('model-consent').dispatchEvent(new Event('change'));};
 $('model-facts').onclick=()=>TravelApp.refineFacts();
 window.TravelLibraryUI={render,view,openDetail};render();
})();
