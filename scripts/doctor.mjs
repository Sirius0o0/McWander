import { amap, McdClient } from '../lib/services.mjs';
const tools = ['query-nearby-stores','query-meals','query-meal-detail','calculate-price','query-store-coupons'];
const results = await Promise.allSettled([
  amap('/v3/place/text',{keywords:'武康大楼',city:'上海',citylimit:'true',offset:'1'}).then(r=>({service:'amap',ok:true,pois:r.pois?.length})),
  new McdClient().tools().then(list=>({service:'mcd',ok:true,tools:list.filter(t=>tools.includes(t.name)).map(t=>({name:t.name,inputSchema:t.inputSchema}))}))
]);
for(const r of results) console.log(JSON.stringify(r.status==='fulfilled'?r.value:{ok:false,message:r.reason.message}));
