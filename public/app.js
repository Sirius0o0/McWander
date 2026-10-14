import {icon} from './icons.js';
import {interests,presets,demoPlan} from './data.js';
import {RouteMap} from './map.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={plan:demoPlan(),input:{city:'上海',start:'武康大楼',hours:3,budget:25,targetKm:8,maxKm:8,departure:'14:00',interests:['architecture','photo']},mode:'demo',selected:0,kind:'meal',view:'explore',busy:false,configured:false,readOnly:false};
let saved=[];try{const raw=JSON.parse(localStorage.getItem('maiwalk-saved')||'[]');if(Array.isArray(raw))saved=raw.filter(p=>p?.stops?.length&&p?.title).slice(0,20);}catch{}
let toastTimer,draftInterests=[];
const routeMap=new RouteMap($('#map-content'),i=>selectStop(i));
function hydrateIcons(){document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),5000);}
function setView(view){state.view=view;['explore','saved','about'].forEach(v=>$(`#${v}-view`).hidden=v!==view);$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#bottom-dock').hidden=view!=='explore';if(view==='saved')renderSaved();window.scrollTo({top:0,behavior:'smooth'});}
function chipsHtml(selected){return interests.map(i=>`<button type="button" class="interest-chip ${selected.includes(i.id)?'selected':''}" data-interest="${i.id}" aria-pressed="${selected.includes(i.id)}">${icon(i.icon)}${i.label}</button>`).join('');}
function toggleInterest(list,id){if(list.includes(id)){if(list.length===1){toast('至少选择一种景点偏好');return;}list.splice(list.indexOf(id),1);}else list.push(id);}
function renderPreferences(){
  $('#header-city').textContent=state.input.city;$('#start-summary').textContent=state.input.start;
  $('#preference-summary').innerHTML=`<button class="setting-stat">${icon('walk')}${state.input.targetKm||state.input.maxKm} km</button><button class="setting-stat">${icon('clock')}${state.input.hours} 小时</button><button class="setting-stat">${icon('wallet')}¥${state.input.budget} / 人</button>`;
  $$('.setting-stat').forEach(b=>b.addEventListener('click',()=>openPreferences()));
  $('#interest-preview').innerHTML=chipsHtml(state.input.interests);$('#interest-preview').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{toggleInterest(state.input.interests,b.dataset.interest);renderPreferences();toast('偏好已更新，请重新生成路线');}));
}
function distanceHint(){const target=Number($('#maxKm').value);$('#distance-output').textContent=`${target} km`;$('#distance-hint').textContent=`规划范围 ${Math.round(target*.75*100)/100}–${Math.round(target*1.125*100)/100} km`;}
function renderDraft(){
  $('#interest-options').innerHTML=chipsHtml(draftInterests);$('#interest-options').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{toggleInterest(draftInterests,b.dataset.interest);renderDraft();}));
}
function openPreferences(focusCity=false){for(const k of ['city','start','hours','budget','departure'])$(`#${k}`).value=state.input[k];$('#maxKm').value=state.input.targetKm||state.input.maxKm;draftInterests=[...state.input.interests];renderDraft();distanceHint();$('#form-note').textContent=state.mode==='demo'?'示例体验使用固定路线。自定义目标在实时规划中生效。':'根据目标里程规划。若时长不足或区域景点不足，会提示调整。';$('#preferences-dialog').showModal();if(focusCity)$('#city').focus();}
function switchTab(tab){for(const name of ['map','itinerary']){$(`#${name}-tab`).classList.toggle('active',name===tab);$(`#${name}-tab`).setAttribute('aria-selected',String(name===tab));$(`#${name}-panel`).hidden=name!==tab;}if(tab==='map')requestAnimationFrame(()=>routeMap.render());}
function selectStop(i){state.selected=i;routeMap.select(i);$$('.timeline-stop').forEach(el=>el.classList.toggle('selected',Number(el.dataset.stop)===i));renderSelection();}
function renderSelection(){const s=state.plan.stops[state.selected];if(!s)return;$('#map-selection').innerHTML=`<span class="stop-number ${s.kind==='mcd'?'mcd':''}">${state.selected+1}</span><span class="selection-copy"><strong>${escape(s.name)}</strong><small>${escape(s.time)} · ${s.stay?`停留 ${s.stay} 分钟`:'出发'}${s.opening?' · '+escape(s.opening):''}</small></span>${icon('chevron')}`;}
function renderTimeline(){
  $('#timeline').innerHTML=state.plan.stops.map((s,i)=>`<div class="timeline-stop ${state.selected===i?'selected':''}" data-stop="${i}" role="button" tabindex="0" aria-label="查看${escape(s.name)}"><span class="stop-number ${s.kind==='mcd'?'mcd':''}">${i+1}</span><div class="timeline-content"><div class="timeline-top"><h4>${escape(s.name)}</h4><time>${escape(s.time)}</time></div><p>${escape(s.address||s.description||'')}</p><div class="timeline-meta">${s.stay?`<span>停留 ${s.stay} 分钟</span>`:'<span>出发点</span>'}${s.walkMinutes?`<span>上一站步行 ${s.walkMinutes} 分钟</span>`:''}</div></div></div>`).join('');
  $$('.timeline-stop').forEach(el=>{el.addEventListener('click',()=>selectStop(Number(el.dataset.stop)));el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();selectStop(Number(el.dataset.stop));}});});
}
function duration(minutes){return minutes>=60?`${Math.floor(minutes/60)}<small>小时</small>${minutes%60?Math.round(minutes%60)+'<small>分</small>':''}`:`${minutes}<small>分</small>`;}
function renderPlan(){
  const p=state.plan;$('#route-title').textContent=p.title;$('#route-subtitle').textContent=p.mode==='demo'?`${p.start}出发 · ${p.subtitle}`:p.subtitle;
  $('#data-badge').textContent=p.mode==='live'?'已核验':'示例';$('#data-badge').classList.toggle('live',p.mode==='live');
  $('#route-stats').innerHTML=`<div class="stat"><div class="stat-value">${p.distance}<small>km</small></div><div class="stat-label">步行距离</div></div><div class="stat"><div class="stat-value">${duration(p.totalMinutes)}</div><div class="stat-label">含停留时间</div></div><div class="stat"><div class="stat-value">${p.stops.length}<small>站</small></div><div class="stat-label">途经地点</div></div>`;
  $('#route-insight').innerHTML=`麦当劳休息 ${p.stops.find(s=>s.kind==='mcd')?.stay||20} 分钟 · ${p.mode==='live'?'相比原路段':'示例'}多走 <strong>${p.detourMinutes} 分钟</strong>`;
  $('#source-notice').textContent=p.notice;$('#trace-list').innerHTML=(p.trace||[]).map(t=>`<div class="trace-row">${t.ok?'✓':'—'} ${escape(t.name)}</div>`).join('');
  if(p.checkedAt){const row=document.createElement('div');row.className='trace-row';row.textContent=`查询时间 ${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(p.checkedAt))}（北京时间）`;$('#trace-list').append(row);}
  routeMap.setPlan(p,state.selected);$('#zoom-in').disabled=p.mode==='demo';$('#zoom-out').disabled=p.mode==='demo';renderSelection();renderTimeline();renderMeals();renderSaveState();
}
function renderMeals(){
  const p=state.plan,meal=p.meal,store=p.stops.find(s=>s.kind==='mcd');
  $('#store-name').textContent=store?.name||'沿途门店';$('#store-address').textContent=p.mode==='demo'?'演示位置，未查询真实门店':store?.address||'';$('#meal-checked').textContent=p.mode==='live'?'官方核价':'示例价格';
  const options=meal.options?.length?meal.options:[{...meal,title:meal.title||'餐品组合',kind:'meal',contents:meal.items.map(x=>x.name),source:'menu'}];
  if(!options.some(q=>q.kind===state.kind))state.kind=options[0]?.kind||'meal';
  $$('[data-kind]').forEach(b=>b.classList.toggle('active',b.dataset.kind===state.kind));
  const shown=options.filter(q=>q.kind===state.kind);
  $('#meal-options').innerHTML=shown.length?shown.map(q=>{
    const reference=q.referencePrice??q.originalPrice,index=options.indexOf(q),selected=q.title===meal.title&&q.price===meal.price;
    return `<button class="meal-option ${selected?'selected':''}" data-option="${index}" aria-pressed="${selected}"><span class="option-radio"></span><span class="option-copy"><strong>${escape(q.title)}<em class="${q.source==='coupon'?'coupon':''}">${p.mode==='demo'?'示例':q.source==='coupon'?'券后价':q.source==='combo'?'套餐价':'单点价'}</em></strong><small>${escape(q.contents?.join(' + ')||q.items.map(x=>x.name).join(' + '))}</small></span><span class="option-price"><strong>${q.price===null?'待确认':'¥'+q.price.toFixed(2).replace(/\.00$/,'')}</strong>${reference>q.price?`<s>${q.referenceLabel||'官方原价'} ¥${reference.toFixed(2)}</s><small>省 ¥${(reference-q.price).toFixed(2)}</small>`:''}</span></button>`;
  }).join(''):'<p class="empty-options">当前没有预算内已核价的方案</p>';
  $$('[data-option]').forEach(b=>b.addEventListener('click',()=>{const q=options[Number(b.dataset.option)];Object.assign(state.plan.meal,q,{options});renderMeals();}));
  const available=meal.availableCoupons||[];
  $('#coupon-section').innerHTML=p.mode==='live'&&available.length?`<details><summary>${available.length} 张优惠券可领取</summary><ul>${available.map(c=>`<li>${escape(c.title)}</li>`).join('')}</ul>${state.readOnly?'<p>领券请在电脑本机操作。</p>':'<button id="claim-coupons" class="text-button">领取并重新比价</button>'}</details>`:'';
  $('#claim-coupons')?.addEventListener('click',()=>{if(!p.planId){toast('请重新生成路线后领券');return;}$('#claim-dialog').showModal();});
  $('#meal-footnote').textContent=p.mode==='demo'?'示例餐品和价格，不用于实际购买。':`已比较 ${meal.comparedCount||options.length} 个候选。券后价已核验当前门店可用性；未来到店前需复核。${meal.couponQueryFailed?'本次查券失败，结果未包含个人券。':''}`;
}
const signature=p=>JSON.stringify([p.mode,p.title,p.input.city,p.input.start,p.input.departure]);
function persist(){try{localStorage.setItem('maiwalk-saved',JSON.stringify(saved));return true;}catch{toast('浏览器存储空间不足');return false;}}
function renderSaveState(){const isSaved=saved.some(p=>signature(p)===signature(state.plan));$('#save-route').setAttribute('aria-pressed',String(isSaved));$('#save-route').setAttribute('aria-label',isSaved?'取消收藏路线':'收藏路线');$('#saved-dot').hidden=!saved.length;}
function saveRoute(){const index=saved.findIndex(p=>signature(p)===signature(state.plan));if(index>=0){saved.splice(index,1);persist();toast('已取消收藏');}else{if(saved.length>=20){toast('最多收藏 20 条路线');return;}saved.unshift(structuredClone(state.plan));if(!persist())saved.shift();else toast('已收藏');}renderSaveState();}
function renderSaved(){
  if(!saved.length){$('#saved-list').innerHTML=`<div class="empty-state">${icon('heart')}<h3>还没有收藏的路</h3><p>遇见喜欢的路线，点一下爱心，<br>留给下次出门的自己。</p><button id="back-explore">去找一条路</button></div>`;$('#back-explore').addEventListener('click',()=>setView('explore'));return;}
  $('#saved-list').innerHTML=saved.map((p,i)=>`<article class="saved-card"><div class="saved-card-kicker"><span>${escape(p.city)}</span><span>${p.mode==='demo'?'示例':'查询快照'}</span></div><h3>${escape(p.title)}</h3><p>${p.distance} km · ${p.totalMinutes} 分钟 · ${p.stops.length} 站<br>${p.stops.map(s=>escape(s.name)).join(' → ')}</p><div class="saved-card-actions"><button data-load="${i}">打开路线${icon('arrow')}</button><button data-delete="${i}" aria-label="删除${escape(p.title)}">${icon('trash')}</button></div></article>`).join('');
  $$('[data-load]').forEach(b=>b.addEventListener('click',()=>{state.plan=structuredClone(saved[Number(b.dataset.load)]);state.input={...state.plan.input,targetKm:state.plan.input.targetKm||state.plan.input.maxKm};state.mode=state.plan.mode;state.selected=0;state.kind='meal';setView('explore');renderPreferences();renderMode();renderPlan();if(state.mode==='live')toast('已打开快照，出发前请重新规划');}));
  $$('[data-delete]').forEach(b=>b.addEventListener('click',()=>{saved.splice(Number(b.dataset.delete),1);persist();renderSaved();renderSaveState();}));
}
function renderExamples(){
  $('#inspirations').innerHTML=presets.map(p=>`<button class="example-button" data-preset="${p.id}"><img class="example-art" src="/assets/${p.id}.svg" alt="${escape(p.city)}街景插画"><span class="example-copy"><span class="example-city">${p.city}</span><strong>${escape(p.title)}</strong><small>${p.distance} km · ${escape(p.subtitle)} · 示例</small></span>${icon('chevron')}</button>`).join('');
  $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{state.plan=demoPlan(b.dataset.preset);state.input={...state.plan.input,targetKm:state.plan.input.maxKm};state.selected=0;state.mode='demo';state.kind='meal';renderPreferences();renderMode();renderPlan();window.scrollTo({top:0,behavior:'smooth'});}));
}
function renderMode(){$('#mode-text').textContent=state.mode==='live'?'实时规划':'示例体验';$('#generate-label').textContent=state.mode==='live'?'生成散步路线':'看看这条路';$$('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===state.mode));}
async function generate(){
  if(state.busy)return;
  if(state.mode==='demo'){const preset=presets.find(p=>p.city===state.input.city.replace('市',''));if(!preset){toast('示例仅支持上海、杭州、成都');return;}state.plan=demoPlan(preset.id,{departure:state.input.departure});state.selected=0;renderPlan();toast('固定示例路线；自定义距离请切换实时规划');return;}
  if(!state.configured){toast('请先配置本机服务凭证');return;}
  state.busy=true;$('#generate-route').disabled=true;$('#loading-overlay').hidden=false;
  const messages=['找一找沿途的街巷与风景…','串起一条接近目标里程的路…','核验步行距离与门店营业时间…','为休息这一站，比较套餐和优惠…'];let tick=0;$('#loading-message').textContent=messages[0];const timer=setInterval(()=>$('#loading-message').textContent=messages[Math.min(++tick,3)],10000);
  try{const r=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.input),signal:AbortSignal.timeout(180000)}),p=await r.json();if(!r.ok)throw new Error(p.error||'规划失败');state.plan=p;state.selected=0;state.kind='meal';renderPlan();switchTab('map');toast(`已生成 ${p.distance} km 路线`);window.scrollTo({top:0,behavior:'smooth'});}
  catch(e){toast(e.name==='TimeoutError'?'查询超时，请稍后重试':e.message||'连接失败');}finally{clearInterval(timer);state.busy=false;$('#generate-route').disabled=false;$('#loading-overlay').hidden=true;}
}
function openShare(){const p=state.plan;$('#share-preview').innerHTML=`<h3>${escape(p.title)}</h3><p>${p.distance} km · ${p.totalMinutes} 分钟 · ${p.mode==='demo'?'示例路线':'查询快照'}</p><ol>${p.stops.map(s=>`<li>${escape(s.time)}　${escape(s.name)}</li>`).join('')}</ol><small>${p.mode==='demo'?'示例数据，不用于导航。':'出发前请复核门店与景点开放情况。'}</small>`;$('#share-dialog').showModal();}
function routeText(){const p=state.plan;return `${p.title}\n${p.distance} km · ${p.totalMinutes} 分钟 · ${p.mode==='demo'?'示例':'查询快照'}\n\n${p.stops.map(s=>`${s.time} ${s.name}${s.stay?' · 停留 '+s.stay+' 分钟':''}`).join('\n')}\n\n${p.mode==='demo'?'示例数据，不用于导航。':'出发前请复核营业、库存与价格。'}\n麦步 · 独立开发作品`;}
async function downloadCard(){
  const p=state.plan,canvas=document.createElement('canvas');canvas.width=900;canvas.height=360+p.stops.length*100;const ctx=canvas.getContext('2d');ctx.fillStyle='#fffcf3';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ffbc0d';ctx.fillRect(0,0,canvas.width,14);ctx.fillStyle='#1d1d1f';ctx.font='800 40px sans-serif';ctx.fillText(p.title.slice(0,20),55,85);ctx.fillStyle='#888';ctx.font='22px sans-serif';ctx.fillText(`${p.distance} km  ·  ${p.totalMinutes} 分钟  ·  ${p.stops.length} 站`,55,135);let y=210;
  for(const [i,s]of p.stops.entries()){ctx.fillStyle=s.kind==='mcd'?'#c62828':'#6f5000';ctx.beginPath();ctx.arc(75,y-8,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.fillText(String(i+1),69,y-1);ctx.fillStyle='#30291f';ctx.font='600 24px sans-serif';ctx.fillText(`${s.time}  ${s.name.slice(0,25)}`,115,y);ctx.fillStyle='#7d715e';ctx.font='18px sans-serif';ctx.fillText(s.stay?'停留 '+s.stay+' 分钟':'出发点',115,y+32);y+=100;}
  ctx.font='18px sans-serif';ctx.fillStyle='#999';ctx.fillText(p.mode==='demo'?'示例路线，不用于实际导航。':'查询快照，出发前请复核开放情况与价格。',55,canvas.height-95);ctx.fillText('麦步 · 独立开发作品 · 非麦当劳官方产品',55,canvas.height-55);const a=document.createElement('a');a.download=`麦步-${p.city}-路线.png`;a.href=canvas.toDataURL('image/png');a.click();toast('路线图片已生成');
}
hydrateIcons();renderPreferences();renderMode();renderPlan();renderExamples();
$('#preferences-open').addEventListener('click',()=>openPreferences());$('#city-switch').addEventListener('click',()=>openPreferences(true));$('#maxKm').addEventListener('input',distanceHint);
$('#preferences-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target),targetKm=Number(data.get('maxKm'));state.input={city:data.get('city').trim(),start:data.get('start').trim(),hours:Number(data.get('hours')),budget:Number(data.get('budget')),targetKm,maxKm:targetKm,departure:data.get('departure'),interests:[...draftInterests]};if(!state.input.city||!state.input.start){toast('请填写城市与出发地点');return;}$('#preferences-dialog').close();renderPreferences();toast('设置已保存');});
$$('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$$('dialog').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right))d.close();}));
$('#mode-button').addEventListener('click',()=>$('#mode-dialog').showModal());$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;renderMode();$('#mode-dialog').close();}));
$('#generate-route').addEventListener('click',generate);$('#save-route').addEventListener('click',saveRoute);$('#share-route').addEventListener('click',openShare);$('#map-tab').addEventListener('click',()=>switchTab('map'));$('#itinerary-tab').addEventListener('click',()=>switchTab('itinerary'));
$$('[role=tab]').forEach(b=>b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const t=b.id==='map-tab'?'itinerary':'map';switchTab(t);$(`#${t}-tab`).focus();}}));
$('#map-selection').addEventListener('click',()=>{switchTab('itinerary');$(`.timeline-stop[data-stop="${state.selected}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});});
$('#zoom-in').addEventListener('click',()=>routeMap.zoom(1));$('#zoom-out').addEventListener('click',()=>routeMap.zoom(-1));$('#zoom-reset').addEventListener('click',()=>routeMap.fit());$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('[data-kind]').forEach(b=>b.addEventListener('click',()=>{state.kind=b.dataset.kind;renderMeals();}));
$('#download-card').addEventListener('click',()=>downloadCard().catch(()=>toast('图片生成失败')));$('#copy-route').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(routeText());toast('行程已复制');}catch{toast('浏览器未允许复制');}});
$('#confirm-claim').addEventListener('click',async()=>{const b=$('#confirm-claim');b.disabled=true;b.textContent='正在领取并比价…';try{const r=await fetch('/api/meals/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({planId:state.plan.planId,confirmed:true})}),meal=await r.json();if(!r.ok)throw new Error(meal.error);state.plan.meal=meal;state.kind='meal';renderMeals();$('#claim-dialog').close();toast('已重新核价');}catch(e){toast(e.message||'领券结果未确认，请检查官方券包');}finally{b.disabled=false;b.textContent='确认领券并重新比价';}});
$('#check-services').addEventListener('click',async()=>{const b=$('#check-services');b.disabled=true;$('#service-result').textContent='正在检查…';try{const r=await fetch('/api/health',{method:'POST'}),d=await r.json();$('#service-result').textContent=d.services?d.services.map(s=>`${s.name}：${s.ok?'正常':s.message}`).join(' / '):'检查失败';}catch{$('#service-result').textContent='连接失败';}finally{b.disabled=false;}});
fetch('/api/status').then(r=>r.json()).then(s=>{state.configured=s.mcd&&s.amap;state.readOnly=!!s.readOnly;if(state.configured&&new URLSearchParams(location.search).get('demo')!=='1')state.mode='live';renderMode();$('#configuration-note').textContent=state.configured?'本机配置已就绪。':'实时规划需要配置本机服务凭证。';$('[data-mode=live]').disabled=!state.configured;}).catch(()=>$('#configuration-note').textContent='无法连接本机服务。');
