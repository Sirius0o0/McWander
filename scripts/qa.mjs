import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}),errors=[],badMaps=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/map')&&r.status()>=400)badMaps.push(r.status());});
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>/本机配置已就绪|实时规划需要配置本机服务凭证/.test(document.querySelector('#configuration-note').textContent));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.hero').count(),0);
  await page.locator('#preferences-open').click();await page.locator('#budget').fill('25');await page.locator('#maxKm').fill('8');await page.locator('#maxKm').dispatchEvent('input');assert.match(await page.locator('#distance-hint').textContent(),/6–9/);await page.locator('#preferences-form button[type=submit]').click();
  assert.match(await page.locator('#preference-summary').textContent(),/8 km/);
  await page.locator('#save-route').click();await page.locator('[data-view=saved]').click();assert.equal(await page.locator('.saved-card').count(),1);await page.locator('[data-load]').click();
  await page.locator('#itinerary-tab').click();assert.equal(await page.locator('.timeline-stop').count(),5);await page.locator('#map-tab').click();
  await page.locator('#share-route').click();const downloadPromise=page.waitForEvent('download');await page.locator('#download-card').click();assert.match((await downloadPromise).suggestedFilename(),/\.png$/);await page.locator('#share-dialog .close-dialog').click();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#toast')).opacity==='0',{},{timeout:7000});
  for(const width of [320,375,390,1440]){await page.setViewportSize({width,height:width===1440?1000:844});await page.evaluate(()=>window.scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width!==1440){await page.screenshot({path:`artifacts/revision-${width}.png`,fullPage:true});if(width===390)await page.screenshot({path:'artifacts/citywalk-mobile.png',fullPage:false});}}
  console.log(JSON.stringify({ui:'passed',screens:[320,375,390,1440],errors}));
  if(process.argv.includes('--live')||process.argv.includes('--replay')){
    await page.setViewportSize({width:390,height:844});
    const result=process.argv.includes('--replay')?{status:200,data:JSON.parse(await readFile('artifacts/revision-live.json','utf8'))}:await page.evaluate(async()=>{const r=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({city:'上海',start:'武康大楼',hours:3,budget:25,targetKm:8,departure:'14:00',interests:['architecture','photo']})});return {status:r.status,data:await r.json()};});
    console.log(JSON.stringify({live:result.status===200,status:result.status,error:result.data.error,distance:result.data.distance,minutes:result.data.totalMinutes,price:result.data.meal?.price,saving:result.data.meal?.saving}));
    assert.equal(result.status,200);assert.ok(result.data.distance>=6&&result.data.distance<=9&&result.data.totalMinutes<=180);assert.ok(result.data.meal.price<24.5&&result.data.meal.verified&&result.data.meal.kind==='meal');assert.ok(result.data.meal.options.some(q=>q.source==='coupon'));
    await page.route('**/api/plan',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result.data)}));
    await page.locator('#preferences-open').click();await page.locator('#maxKm').fill('8');await page.locator('#preferences-form button[type=submit]').click();
    await page.locator('#mode-button').click();await page.locator('[data-mode=live]').click();await page.locator('#generate-route').click();await page.locator('#data-badge.live').waitFor();await page.locator('#loading-overlay').waitFor({state:'hidden'});
    await page.locator('.map-base').waitFor();await page.waitForFunction(()=>{const image=document.querySelector('.map-base');return image?.complete&&image.naturalWidth>0;});
    const base1=await page.locator('.map-base').getAttribute('src');await page.locator('#zoom-in').click();await page.waitForFunction(()=>{const image=document.querySelector('.map-base');return image?.complete&&image.naturalWidth>0;});const base2=await page.locator('.map-base').getAttribute('src');assert.notEqual(new URL(base1).searchParams.get('zoom'),new URL(base2).searchParams.get('zoom'));
    const size=await page.locator('#map-content').evaluate(el=>({width:el.clientWidth,height:el.clientHeight}));assert.equal(Number(new URL(base2).searchParams.get('width')),size.width);assert.equal(Number(new URL(base2).searchParams.get('height')),size.height);
    await page.locator('#zoom-reset').click();await page.waitForFunction(()=>{const image=document.querySelector('.map-base');return image?.complete&&image.naturalWidth>0;});
    await page.locator('[data-map-stop="2"]').click();assert.match(await page.locator('#map-selection').textContent(),new RegExp(result.data.stops[2].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    await page.locator('[data-kind=snack]').click();assert.ok(await page.locator('.meal-option').count()>0);await page.locator('[data-kind=meal]').click();
    // Check confirmation UI without submitting the real account mutation.
    if(await page.locator('#claim-coupons').count()){await page.locator('#coupon-section details').evaluate(el=>el.open=true);await page.locator('#claim-coupons').click();assert.equal(await page.locator('#claim-dialog').isVisible(),true);await page.locator('#claim-dialog .close-dialog').click();}
    await page.evaluate(()=>window.scrollTo(0,0));await page.waitForFunction(()=>getComputedStyle(document.querySelector('#toast')).opacity==='0',{},{timeout:7000});await page.screenshot({path:'artifacts/revision-live.png',fullPage:true});
    await page.locator('.map-container').screenshot({path:'artifacts/revision-map.png'});
    await writeFile('artifacts/revision-live.json',JSON.stringify(result.data,null,2));assert.deepEqual(badMaps,[]);console.log(JSON.stringify({map:'camera and overlays verified',claim:'not submitted'}));
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
