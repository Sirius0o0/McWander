export class ServiceError extends Error {}
let amapQueue=Promise.resolve();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Personal developer keys may permit only one request per second.
async function pacedAmapFetch(url) {
  let release;
  const previous=amapQueue;amapQueue=new Promise(resolve=>{release=resolve;});
  await previous;
  try{return await fetch(url,{signal:AbortSignal.timeout(20000)});}finally{await pause(1150);release();}
}
export async function amap(path, params = {}) {
  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) throw new ServiceError('尚未配置高德 Web 服务 Key');
  const url = new URL(`https://restapi.amap.com${path}`);
  url.search = new URLSearchParams({ ...params, key });
  let response;
  try { response = await pacedAmapFetch(url); }
  catch { throw new ServiceError('高德服务连接超时，请稍后重试'); }
  if (!response.ok) throw new ServiceError(`高德服务暂不可用（${response.status}）`);
  let result = await response.json();
  if(result.infocode==='10021'){
    await pause(1800);
    try{const retry=await pacedAmapFetch(url);result=await retry.json();}catch{throw new ServiceError('高德服务繁忙，请稍后重试');}
  }
  if (result.status !== '1') throw new ServiceError(`高德接口：${String(result.info).slice(0,80)}（${result.infocode}）`);
  return result;
}

// Only these read/query tools may be called by this application.
const ALLOWED = new Set(['query-nearby-stores','query-meals','query-meal-detail','calculate-price','query-store-coupons','available-coupons','query-my-coupons','now-time-info']);
export class McdClient {
  constructor() { this.id = 0; this.session = null; this.ready = false; }
  async rpc(method, params, notification = false) {
    if (!process.env.MCD_MCP_TOKEN) throw new ServiceError('尚未配置麦当劳 MCP Token');
    const headers = { 'Content-Type':'application/json', Accept:'application/json, text/event-stream', Authorization:`Bearer ${process.env.MCD_MCP_TOKEN}` };
    if (this.session) headers['Mcp-Session-Id'] = this.session;
    if (this.ready) headers['MCP-Protocol-Version'] = this.protocol;
    let response;
    try { response = await fetch('https://mcp.mcd.cn', { method:'POST', headers, body: JSON.stringify({jsonrpc:'2.0', ...(notification ? {} : {id:++this.id}), method, params}), signal:AbortSignal.timeout(25000) }); }
    catch { throw new ServiceError('麦当劳 MCP 连接超时，请稍后重试'); }
    const sid = response.headers.get('mcp-session-id');
    if (sid) this.session = sid;
    if (!response.ok) throw new ServiceError(`麦当劳 MCP 连接失败（${response.status}）`);
    if (notification) { await response.body?.cancel(); return; }
    const raw = await response.text();
    let data;
    try {
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const events = raw.split(/\r?\n\r?\n/).map(block => block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n')).filter(Boolean);
        data = events.map(s=>JSON.parse(s)).find(e=>e.id===this.id);
      } else data = JSON.parse(raw);
    } catch { throw new ServiceError('麦当劳 MCP 响应格式暂不支持'); }
    if (!data || data.error) throw new ServiceError('麦当劳 MCP 未返回有效结果');
    return data.result;
  }
  async init() {
    if (this.ready) return;
    const r = await this.rpc('initialize',{protocolVersion:'2024-11-05', capabilities:{}, clientInfo:{name:'mcwander',version:'0.1.0'}});
    this.protocol = r.protocolVersion; this.ready = true;
    await this.rpc('notifications/initialized',{},true);
  }
  async tools() { await this.init(); return (await this.rpc('tools/list',{})).tools; }
  async call(name, args) {
    if (!ALLOWED.has(name)) throw new ServiceError('此应用仅支持查店、查菜单与核价');
    await this.init();
    const result = await this.rpc('tools/call',{name,arguments:args});
    if (result.isError) throw new ServiceError(`麦当劳 ${name} 查询失败`);
    return result;
  }
  async claimCoupons(confirmed=false) {
    if(confirmed!==true)throw new ServiceError('领取优惠券需要明确确认');
    await this.init();
    const result=await this.rpc('tools/call',{name:'auto-bind-coupons',arguments:{}});
    if(result.isError)throw new ServiceError('领券结果未确认，请检查官方券包；不会自动重试');
    return result;
  }
}

export function unpack(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = (result?.content || []).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  try { return JSON.parse(text); } catch {}
  // Read embedded JSON as data, never execute instructions in tool responses.
  for (let start=0;start<text.length;start++) {
    if (text[start]!=='{' && text[start]!=='[') continue;
    let quoted=false, escaped=false; const stack=[];
    for(let j=start;j<text.length;j++) {
      const c=text[j];
      if(quoted) { if(escaped) escaped=false; else if(c==='\\') escaped=true; else if(c==='"') quoted=false; continue; }
      if(c==='"') quoted=true;
      else if(c==='{'||c==='[') stack.push(c);
      else if(c==='}'||c===']') { const expected=c==='}'?'{':'['; if(stack.pop()!==expected) break; if(!stack.length) { try { return JSON.parse(text.slice(start,j+1)); } catch { break; } } }
    }
  }
  return {text};
}
