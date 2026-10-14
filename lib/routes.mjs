import {amap,McdClient,ServiceError} from './services.mjs';
import {mealFor,businessData} from './meals.mjs';
export function distanceBand(targetKm){return {minKm:Math.round(targetKm*.75*100)/100,maxKm:Math.round(targetKm*1.125*100)/100};}
export function validateInput(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ServiceError('规划参数格式不正确');
  const city=String(input.city||'上海').trim(),start=String(input.start||'武康大楼').trim();
  const hours=Number(input.hours??3),budget=Number(input.budget??25),targetKm=Number(input.targetKm??input.maxKm??5);
  if(!city||city.length>30||!start||start.length>80)throw new ServiceError('请输入有效的城市与出发地点');
  if(!Number.isFinite(hours)||hours<1||hours>8||!Number.isFinite(budget)||budget<5||budget>300||!Number.isFinite(targetKm)||targetKm<1||targetKm>15)throw new ServiceError('时长、预算或步行距离超出支持范围');
  const departure=String(input.departure||'14:00');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(departure))throw new ServiceError('出发时间格式不正确');
  const interests=Array.isArray(input.interests)?input.interests.filter(i=>['architecture','nature','culture','photo'].includes(i)):['architecture','photo'];
  const band=distanceBand(targetKm);return {city,start,hours,budget,targetKm,maxKm:targetKm,interests:interests.length?interests:['architecture'],departure,minKm:band.minKm,upperKm:band.maxKm};
}
export function parseLocation(value){const pair=String(value).split(',').map(Number);return pair.length===2&&pair.every(Number.isFinite)&&Math.abs(pair[0])<=180&&Math.abs(pair[1])<=90?pair:null;}
export function kmBetween(a,b){const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad;const q=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(q)));}
export function timeAt(departure,minutes){const [h,m]=departure.split(':').map(Number),total=h*60+m+Math.round(minutes);return `${total>=1440?'次日 ':''}${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
export function withinOpening(time,start,end){const number=s=>{if(!/^\d{2}:\d{2}$/.test(s||''))return null;const [h,m]=s.split(':').map(Number);return h*60+m;};const t=number(time.replace('次日 ','')),a=number(start),b=number(end);if(t===null||a===null||b===null)return null;return a===b||a<b?(a===b||t>=a&&t<b):(t>=a||t<b);}
function poi(p){const location=parseLocation(p.location);return location?{name:p.name,address:Array.isArray(p.address)?'':p.address,location,kind:'spot',description:Array.isArray(p.address)?'':p.address,stay:10}:null;}
function straightLength(stops){return stops.slice(1).reduce((sum,s,i)=>sum+kmBetween(stops[i].location,s.location),0);}
function bendPenalty(path){let cost=0;for(let i=2;i<path.length;i++){const [a,b,c]=path.slice(i-2,i+1).map(p=>p.location),u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]];const cosine=(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1);if(cosine<-.5)cost+=.3;}return cost;}
export function selectEstimatedRoute(origin,spots,targetKm){
  const target=Math.max(.6,targetKm-.35),minStops=Math.max(2,Math.min(4,Math.floor(targetKm/2))),maxStops=Math.max(minStops,Math.min(6,Math.ceil(targetKm/1.6)));
  let beam=[{path:[origin],used:new Set(),length:0}],finished=[];
  for(let depth=1;depth<=maxStops;depth++){
    const next=[];
    for(const state of beam)for(let i=0;i<spots.length;i++){
      if(state.used.has(i))continue;const leg=kmBetween(state.path.at(-1).location,spots[i].location);
      if(leg<.3||leg>Math.max(1.3,targetKm*.44))continue;
      const length=state.length+leg*1.22;if(length>targetKm*1.2)continue;
      const path=[...state.path,spots[i]],used=new Set(state.used);used.add(i);
      next.push({path,used,length,score:Math.abs(length-target)+bendPenalty(path)});
    }
    next.sort((a,b)=>a.score-b.score);beam=next.slice(0,140);
    if(depth>=minStops)finished.push(...beam.slice(0,35));if(!beam.length)break;
  }
  finished.sort((a,b)=>a.score-b.score||a.path.length-b.path.length);
  if(!finished.length)throw new ServiceError('附近景点不足以构成目标里程，请降低距离或更换出发点');
  return finished[0].path;
}
export function assertDistance(meters,p){const band=distanceBand(p.targetKm);if(meters<band.minKm*1000||meters>band.maxKm*1000)throw new ServiceError(`当前候选路线为 ${(meters/1000).toFixed(1)} km，未达到目标 ${p.targetKm} km 的 ${band.minKm}–${band.maxKm} km 范围，请更换出发点或调整距离。`);}
async function search(city,keyword){return (await amap('/v3/place/text',{city,citylimit:'true',keywords:keyword,offset:'5',extensions:'base'})).pois||[];}
async function candidateSpots(origin,p){
  const types=p.interests.includes('nature')?'110100|110200':p.interests.includes('culture')?'140100|140200|110200':'110000|140100';
  const radius=Math.min(5000,Math.max(1200,p.targetKm*440)),shift=radius*.52/111320;
  const centers=[origin.location,[origin.location[0]+shift/Math.cos(origin.location[1]*Math.PI/180),origin.location[1]],[origin.location[0],origin.location[1]+shift]];
  const result=[];
  for(const center of centers){const r=await amap('/v3/place/around',{location:center.map(x=>x.toFixed(6)).join(','),radius:String(Math.round(radius*.75)),types,offset:'25',sortrule:'distance',extensions:'base'});result.push(...(r.pois||[]));}
  const dedup=[];
  for(const item of result){const spot=poi(item);if(!spot||spot.name===origin.name||kmBetween(origin.location,spot.location)<.25||kmBetween(origin.location,spot.location)>p.targetKm*.65||dedup.some(s=>s.name===spot.name||kmBetween(s.location,spot.location)<.22))continue;dedup.push(spot);}
  if(dedup.length<=44)return dedup;
  const sectors=Array.from({length:8},()=>[]);for(const s of dedup){const angle=Math.atan2(s.location[1]-origin.location[1],s.location[0]-origin.location[0]);sectors[Math.floor((angle+Math.PI)/(Math.PI*2)*8)%8].push(s);}return sectors.flatMap(s=>s.slice(0,5));
}
export async function livePlan(input){
  const p=validateInput(input),trace=[];
  if(p.minKm/4.5*60+35>p.hours*60)throw new ServiceError(`目标距离与时长冲突。${p.targetKm} km 建议至少预留 ${Math.ceil((p.minKm/4.5*60+35)/30)/2} 小时。`);
  const origin=(await search(p.city,p.start)).map(poi).find(Boolean);if(!origin)throw new ServiceError('没有找到出发地点，请补充具体建筑、路口或公园名称');origin.stay=0;
  const spots=await candidateSpots(origin,p);trace.push({name:`高德地点搜索 · ${spots.length} 个候选`,ok:true});
  let route=selectEstimatedRoute(origin,spots,p.targetKm);
  const edgeCache=new Map();
  const walk=async(a,b)=>{
    const key=`${a.location}|${b.location}`;if(edgeCache.has(key))return edgeCache.get(key);
    const r=await amap('/v3/direction/walking',{origin:a.location.join(','),destination:b.location.join(',')}),v=r.route?.paths?.[0];
    if(!v||!Number.isFinite(Number(v.distance))||!Number.isFinite(Number(v.duration)))throw new ServiceError('部分路段没有可用的步行路线，请更换出发点');
    const leg={meters:Number(v.distance),minutes:Number(v.duration)/60,coordinates:(v.steps||[]).flatMap(s=>String(s.polyline).split(';').map(parseLocation).filter(Boolean))};edgeCache.set(key,leg);return leg;
  };
  const evaluate=async(stops)=>{const legs=[];for(let i=1;i<stops.length;i++)legs.push(await walk(stops[i-1],stops[i]));return {stops,legs,meters:legs.reduce((s,l)=>s+l.meters,0),minutes:legs.reduce((s,l)=>s+l.minutes,0)};};
  const client=new McdClient(),anchor=route[Math.max(1,Math.floor(route.length/2))];
  const stores=businessData(await client.call('query-nearby-stores',{city:p.city,keyword:anchor.name,beType:1,searchType:2}));
  if(!Array.isArray(stores)||!stores.length)throw new ServiceError('目标区域未查到麦当劳门店，请更换出发点');
  let best=null;
  for(const store of stores.filter(s=>s.businessStatus!==false).slice(0,3)){
    const geo=await amap('/v3/geocode/geo',{address:store.address,city:p.city}),location=parseLocation(geo.geocodes?.[0]?.location);if(!location)continue;
    const stop={name:store.storeName,address:store.address,location,kind:'mcd',stay:20,description:store.address,storeCode:store.storeCode,opening:`${store.businessStartTime||'?'}–${store.businessEndTime||'?'}`,openStart:store.businessStartTime,openEnd:store.businessEndTime};
    for(let i=1;i<route.length;i++){const estimate=kmBetween(route[i-1].location,location)+kmBetween(location,route[i].location)-kmBetween(route[i-1].location,route[i].location),score=estimate+Math.abs(i-route.length*.5)*.08;if(!best||score<best.score)best={stop,index:i,score};}
  }
  if(!best)throw new ServiceError('无法可靠定位沿途门店');
  route.splice(best.index,0,best.stop);let evaluated=await evaluate(route);
  for(let attempt=0;attempt<3&&(evaluated.meters<p.minKm*1000||evaluated.meters>distanceBand(p.targetKm).maxKm*1000);attempt++){
    const factor=evaluated.meters/1000/Math.max(.1,straightLength(route)),proposals=[];
    for(let i=1;i<route.length;i++){
      if(route[i].kind==='mcd')continue;
      if(route.length>4)proposals.push(route.filter((_,j)=>j!==i));
      for(const spot of spots){if(route.some(x=>x.name===spot.name))continue;const next=[...route];next[i]=spot;proposals.push(next);}
    }
    if(evaluated.meters<p.minKm*1000)for(let i=1;i<=route.length;i++)for(const spot of spots){if(route.some(x=>x.name===spot.name))continue;const next=[...route];next.splice(i,0,spot);proposals.push(next);}
    proposals.sort((a,b)=>(Math.abs(straightLength(a)*factor-p.targetKm)+bendPenalty(a)*.2)-(Math.abs(straightLength(b)*factor-p.targetKm)+bendPenalty(b)*.2));
    if(!proposals.length)break;route=proposals[0];evaluated=await evaluate(route);
  }
  assertDistance(evaluated.meters,p);
  let totalMinutes=evaluated.minutes+route.reduce((sum,s)=>sum+s.stay,0);
  if(totalMinutes>p.hours*60){const room=p.hours*60-evaluated.minutes-20,scenic=route.filter(s=>s.kind!=='mcd').length-1;if(room<scenic*4)throw new ServiceError(`路线 ${(evaluated.meters/1000).toFixed(1)} km 需约 ${Math.ceil(totalMinutes)} 分钟，请增加时长。`);for(const s of route)if(s!==origin&&s.kind!=='mcd')s.stay=Math.min(10,Math.floor(room/scenic));totalMinutes=evaluated.minutes+route.reduce((sum,s)=>sum+s.stay,0);}
  let elapsed=0;route.forEach((s,i)=>{if(i)elapsed+=evaluated.legs[i-1].minutes;s.time=timeAt(p.departure,elapsed);s.walkMinutes=i?Math.round(evaluated.legs[i-1].minutes):0;s.elapsed=elapsed;elapsed+=s.stay;});
  const mcd=route.find(s=>s.kind==='mcd');
  if(withinOpening(mcd.time,mcd.openStart,mcd.openEnd)!==true||withinOpening(timeAt(p.departure,mcd.elapsed+mcd.stay),mcd.openStart,mcd.openEnd)!==true)throw new ServiceError('预计休息时段门店可能已打烊，请调整出发时间');
  const index=route.indexOf(mcd),left=route[index-1],right=route[index+1];let detour=0;
  if(left&&right){const direct=await walk(left,right);detour=Math.max(0,evaluated.legs[index-1].minutes+evaluated.legs[index].minutes-direct.minutes);}
  const meal=await mealFor(client,mcd.storeCode,p.budget);
  trace.push({name:'目标里程 · 高德道路距离复核',ok:true},{name:'门店地址与营业窗口',ok:true},{name:`套餐 / 券后 / 单点 · ${meal.comparedCount} 个候选核价`,ok:meal.verified});
  return {mode:'live',city:p.city,title:`${origin.name}出发`,subtitle:`目标 ${p.targetKm} km · 可接受 ${p.minKm}–${distanceBand(p.targetKm).maxKm} km`,theme:'城市步行',input:p,stops:route,legs:evaluated.legs,coordinates:evaluated.legs.flatMap(l=>l.coordinates),distance:Math.round(evaluated.meters/100)/10,walkingMinutes:Math.round(evaluated.minutes),totalMinutes:Math.ceil(totalMinutes),detourMinutes:Math.ceil(detour),meal,trace,notice:'道路距离来自高德。餐品、券与价格为查询时快照；未来到店前需复核。景点停留为估计，未核验门票、开放时间与内部设施。',checkedAt:new Date().toISOString()};
}
