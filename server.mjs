import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {livePlan} from './lib/planner.mjs';
import {amap,McdClient,ServiceError} from './lib/services.mjs';
import {mealFor} from './lib/meals.mjs';
import {networkInterfaces} from 'node:os';
import {allowsPreviewHost} from './lib/preview-access.mjs';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const port=Number(process.env.PORT||4173),lan=process.argv.includes('--lan'),host=lan?'0.0.0.0':'127.0.0.1';
const lanAddresses=lan?Object.values(networkInterfaces()).flat().filter(a=>a?.family==='IPv4'&&!a.internal).map(a=>a.address):[];
const maps=new Map(); let planning=false;
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if(!allowsPreviewHost(req.headers.host,port,lanAddresses))return json(res,403,{error:'请使用本机或此电脑的局域网地址访问'});
  const url=new URL(req.url,`http://${host}:${port}`);
  // The user authorized LAN queries; account mutations remain local-only.
  if(lan&&url.pathname==='/api/meals/claim')return json(res,403,{error:'局域网仅开放查询与核价，领券请在电脑本机操作。'});
  try {
    if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{mcd:!!process.env.MCD_MCP_TOKEN,amap:!!process.env.AMAP_WEB_SERVICE_KEY,readOnly:lan});
    if(url.pathname==='/api/health'&&req.method==='POST'){
      if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'请求来源无效'});
      const result=await Promise.allSettled([amap('/v3/place/text',{keywords:'武康大楼',city:'上海',offset:'1'}),new McdClient().tools()]);
      return json(res,200,{services:result.map((r,i)=>({name:i?'麦当劳 MCP':'高德地图',ok:r.status==='fulfilled',message:r.status==='fulfilled'?'连接正常':r.reason.message}))});
    }
    if(url.pathname==='/api/plan'&&req.method==='POST'){
      if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'请求来源无效'});
      if(planning)return json(res,429,{error:'正在规划一条路线，请稍等片刻'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)return json(res,413,{error:'请求过大'});}
      let input;try{input=JSON.parse(body);}catch{return json(res,400,{error:'请求格式错误'});}
      planning=true;
      try {
        const plan=await livePlan(input);const id=randomUUID();
        for(const [key,value]of maps)if(Date.now()-value.time>1800000)maps.delete(key);
        if(maps.size>=30)maps.delete(maps.keys().next().value);
        maps.set(id,{coordinates:plan.coordinates,stops:plan.stops,input:plan.input,time:Date.now(),images:new Map(),claiming:false});plan.mapUrl=`/api/map?id=${id}`;plan.planId=id;
        return json(res,200,plan);
      }finally{planning=false;}
    }
    if(url.pathname==='/api/meals/claim'&&req.method==='POST'){
      if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'请求来源无效'});
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1024)return json(res,413,{error:'请求过大'});}
      let body;try{body=JSON.parse(raw);}catch{return json(res,400,{error:'请求格式错误'});}
      const plan=maps.get(body.planId);if(!plan||body.confirmed!==true)return json(res,400,{error:'需要确认领券，且路线仍在有效期内'});
      if(plan.claiming||plan.claimed)return json(res,409,{error:'已经提交过领券请求，请通过官方券包核实，避免重复提交'});
      const store=plan.stops.find(s=>s.kind==='mcd');const client=new McdClient();
      plan.claiming=true;plan.claimed=true;
      try{await client.claimCoupons(true);return json(res,200,await mealFor(client,store.storeCode,plan.input.budget));}finally{plan.claiming=false;}
    }
    if(url.pathname==='/api/map'&&req.method==='GET'){
      const plan=maps.get(url.searchParams.get('id'));if(!plan)return json(res,404,{error:'地图已过期，请重新规划'});
      const width=Number(url.searchParams.get('width')||390),height=Number(url.searchParams.get('height')||360),zoom=Number(url.searchParams.get('zoom')||14),center=url.searchParams.get('center')||plan.stops[0].location.join(',');
      if(!Number.isInteger(width)||width<200||width>1024||!Number.isInteger(height)||height<200||height>1024||!Number.isInteger(zoom)||zoom<10||zoom>17||!/^[-\d.]+,[-\d.]+$/.test(center))return json(res,400,{error:'地图参数错误'});
      const cacheKey=`${width}|${height}|${zoom}|${center}`;
      if(plan.images.has(cacheKey)){res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private,max-age=300'});return res.end(plan.images.get(cacheKey));}
      const remote=new URL('https://restapi.amap.com/v3/staticmap');remote.search=new URLSearchParams({key:process.env.AMAP_WEB_SERVICE_KEY,size:`${width}*${height}`,scale:'1',location:center,zoom:String(zoom)});
      const image=await fetch(remote,{signal:AbortSignal.timeout(20000)});const type=image.headers.get('content-type')||'';
      if(!image.ok||!type.startsWith('image/'))throw new ServiceError('地图底图暂不可用，可查看路线示意');
      const buffer=Buffer.from(await image.arrayBuffer());if(plan.images.size>=12)plan.images.delete(plan.images.keys().next().value);plan.images.set(cacheKey,buffer);
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'private, max-age=300'});return res.end(buffer);
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'不支持的请求方式'});
    const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/walk.css':'walk.css','/app.js':'app.js','/data.js':'data.js','/icons.js':'icons.js','/map.js':'map.js','/assets/street-corner.svg':'assets/street-corner.svg','/assets/shanghai.svg':'assets/shanghai.svg','/assets/hangzhou.svg':'assets/hangzhou.svg','/assets/chengdu.svg':'assets/chengdu.svg','/assets/break.svg':'assets/break.svg'};
    const file=files[url.pathname];if(!file)return json(res,404,{error:'页面不存在'});
    const content=await readFile(path.join(root,file));const ext=path.extname(file);
    res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'})[ext],'Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch(error){json(res,error instanceof ServiceError?422:500,{error:error instanceof ServiceError?error.message:'服务暂不可用，请稍后重试'});}
});
server.listen(port,host,()=>{
  console.log(`McWander is ready: http://127.0.0.1:${port}`);
  for(const address of lanAddresses)console.log(`LAN preview: http://${address}:${port}/`);
});
