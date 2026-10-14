import {unpack,ServiceError} from './services.mjs';
export function businessData(result) {
  const value=unpack(result);
  if(value.success===false||value.code&&Number(value.code)!==200)throw new ServiceError('麦当劳业务查询失败，请稍后重试');
  return value.data??value;
}
const mainPattern=/汉堡|牛堡|鸡腿堡|麦香鸡|麦香鱼|鸡排|麦满分|卷/;
const drinkPattern=/咖啡|美式|奶铁|红茶|可乐|雪碧|牛奶|纯悦|麦炫酷|奶绿/;
function group(name) {return mainPattern.test(name)?'meal':drinkPattern.test(name)?'drink':'snack';}
export function chooseRounds(detail) {
  const chosen=[];
  const rounds=(detail.rounds||[]).map((round,index)=>{
    const choices=(round.choices||[]).filter(c=>c.code);
    const desired=choices.filter(c=>index===0?mainPattern.test(c.name):drinkPattern.test(c.name));
    const cost=c=>{const match=String(c.diffPrice||'0').replace(/\s|¥/g,'').match(/[-+]?\d+(?:\.\d+)?/);return match?Number(match[0]):0;};
    const choice=[...(desired.length?desired:choices)].sort((a,b)=>cost(a)-cost(b)||(Number(b.isDefault)-Number(a.isDefault)))[0];
    const quantity=Math.max(1,Number(round.minQuantity||round.quantity||1));
    if(!choice||Number(round.maxQuantity)>1||quantity>1)throw new ServiceError('此套餐需要额外选配');
    chosen.push({code:choice.code,name:choice.name,quantity});
    return {round:String(round.id??round.round),comboItemList:[{code:choice.code,quantity}]};
  });
  return {roundList:rounds,chosen};
}
export function publicQuote(quote,candidate) {
  if(!Number.isInteger(quote.price)||quote.price<0||!Array.isArray(quote.productList)||!quote.productList.length)return null;
  const expected=candidate.items.map(i=>i.productCode);
  if(!expected.every(code=>quote.productList.some(p=>String(p.productCode)===String(code))))return null;
  if(candidate.coupon&&quote.price===0&&!/免费/.test(candidate.title))return null;
  const original=Number.isInteger(quote.originalPrice)&&quote.originalPrice>=quote.price?quote.originalPrice:quote.price;
  return {title:candidate.title,kind:candidate.kind,source:candidate.coupon?'coupon':candidate.bundle?'combo':'menu',price:quote.price/100,originalPrice:original/100,saving:(original-quote.price)/100,items:quote.productList.map(p=>({name:p.productName,price:Number(p.subtotal||0)/100})),contents:candidate.contents||[],couponTitle:candidate.coupon?.title||null,couponApplied:!!candidate.coupon,verified:true};
}
export async function mealFor(client,storeCode,budget) {
  const common={storeCode,orderType:1,beType:1};
  const call=async(name,args)=>businessData(await client.call(name,args));
  const menu=await call('query-meals',common);
  let coupons=[],available=[],couponQueryFailed=false;
  try{coupons=await call('query-store-coupons',common);}catch{couponQueryFailed=true;}
  try{available=await call('available-coupons',{});}catch{}
  if(!Array.isArray(coupons))coupons=[];if(!Array.isArray(available))available=[];
  const entries=Object.entries(menu.meals||{}).filter(([,m])=>m.name&&!m.canWithOrder&&!/麦金卡|随单购/.test(m.discountType||'')&&Number(m.currentPrice)>=0);
  const candidates=[];const detailCache=new Map();
  const detail=async code=>{if(!detailCache.has(code))detailCache.set(code,await call('query-meal-detail',{...common,code}));return detailCache.get(code);};
  const bundles=entries.filter(([,m])=>/随心配|1\+1|两件套|两件餐|单人餐|三件套/.test(m.name)).sort((a,b)=>Number(a[1].currentPrice)-Number(b[1].currentPrice)).slice(0,4);
  for(const [code,m]of bundles){try{const d=await detail(code);const {roundList,chosen}=chooseRounds(d);if(!chosen.some(x=>mainPattern.test(x.name))&&!mainPattern.test(m.name))continue;candidates.push({title:m.name,kind:'meal',bundle:true,contents:chosen.map(x=>x.name),items:[{productCode:code,quantity:1,...(roundList.length?{roundList}:{})}]});}catch{}}
  for(const coupon of coupons.slice(0,6)){
    const product=coupon.products?.[0];if(!coupon.couponId||!coupon.couponCode||!product?.productCode)continue;
    try{const d=await detail(product.productCode);const {roundList,chosen}=chooseRounds(d);const title=product.productName||coupon.title;
      candidates.push({title,kind:group(title),coupon,contents:chosen.map(x=>x.name),items:[{productCode:product.productCode,quantity:1,couponId:coupon.couponId,couponCode:coupon.couponCode,...(roundList.length?{roundList}:{})}]});
    }catch{ /* Unsupported coupon composition is excluded, never quoted at zero. */ }
  }
  const mains=entries.filter(([,m])=>mainPattern.test(m.name)&&!/套餐|单人餐|双人|多人|组合|精选/.test(m.name)).sort((a,b)=>Number(a[1].currentPrice)-Number(b[1].currentPrice));
  const drinks=entries.filter(([,m])=>drinkPattern.test(m.name)&&!/精选|随单购/.test(m.name)).sort((a,b)=>Number(a[1].currentPrice)-Number(b[1].currentPrice));
  if(mains[0]&&drinks[0])candidates.push({title:'主食 + 饮品',kind:'meal',contents:[mains[0][1].name,drinks[0][1].name],items:[{productCode:mains[0][0],quantity:1},{productCode:drinks[0][0],quantity:1}]});
  for(const [code,m]of drinks.slice(0,2))candidates.push({title:m.name,kind:'drink',contents:[m.name],items:[{productCode:code,quantity:1}]});
  const options=[];
  for(const candidate of candidates){try{const q=publicQuote(await call('calculate-price',{...common,items:candidate.items}),candidate);if(q&&q.price<=budget)options.push(q);}catch{}}
  options.sort((a,b)=>a.price-b.price||b.saving-a.saving);
  const cheapestCombo=options.find(q=>q.kind==='meal'&&q.source==='combo');
  if(cheapestCombo){const candidate=candidates.find(c=>c.title===cheapestCombo.title&&c.bundle);const codes=candidate?.items?.[0]?.roundList?.flatMap(r=>r.comboItemList)||[];
    if(codes.length>1)try{const baseline=await call('calculate-price',{...common,items:codes.map(x=>({productCode:x.code,quantity:x.quantity}))});
      if(Number.isInteger(baseline.price)&&baseline.price>cheapestCombo.price*100&&codes.every(x=>(baseline.productList||[]).some(p=>p.productCode===x.code&&p.quantity===x.quantity))){cheapestCombo.referencePrice=baseline.price/100;cheapestCombo.saving=(baseline.price-Math.round(cheapestCombo.price*100))/100;cheapestCombo.referenceLabel='同品单点';}
    }catch{}
  }
  const recommended=options.find(q=>q.kind==='meal')||options.find(q=>q.kind==='snack')||options[0];
  const safeAvailable=available.filter(c=>c.couponStatus==='CAN_GET').map(c=>({title:c.couponName,status:'可领取'}));
  return {...(recommended||{price:null,originalPrice:null,items:[],verified:false,title:'没有找到预算内方案',kind:'meal',saving:0}),options,couponCount:coupons.length,availableCoupons:safeAvailable,couponQueryFailed,comparedCount:candidates.length,description:'已比较门店套餐、当前可用券和单点组合；所有显示价格均经过官方核价。',checkedAt:new Date().toISOString()};
}
