import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInput,parseLocation,kmBetween,timeAt,withinOpening,distanceBand,assertDistance,selectEstimatedRoute} from '../lib/planner.mjs';
import {unpack,McdClient} from '../lib/services.mjs';
import {chooseRounds,publicQuote} from '../lib/meals.mjs';
import {worldPoint,worldLocation,pixelPoint,fitCamera,layoutMarkers} from '../public/map.js';
test('rejects non-finite, out-of-range and invalid time constraints',()=>{
  for(const input of [{hours:0},{hours:Infinity},{budget:4},{budget:'NaN'},{maxKm:16},{departure:'25:00'}])assert.throws(()=>validateInput(input));
  assert.equal(validateInput({city:' 上海 ',start:' 武康大楼 '}).start,'武康大楼');
});
test('walking distance and locations are numerically valid',()=>{
  assert.deepEqual(parseLocation('121.4,31.2'),[121.4,31.2]);assert.equal(parseLocation('unknown'),null);assert.equal(parseLocation('190,31'),null);
  assert.equal(kmBetween([121,31],[121,31]),0);assert.ok(kmBetween([121,31],[121.01,31])>.9);
});
test('time arithmetic crosses midnight and checks overnight hours',()=>{
  assert.equal(timeAt('23:50',30),'次日 00:20');assert.equal(withinOpening('23:40','22:00','02:00'),true);assert.equal(withinOpening('01:30','22:00','02:00'),true);assert.equal(withinOpening('03:00','22:00','02:00'),false);assert.equal(withinOpening('22:00','07:00','22:00'),false);assert.equal(withinOpening('14:00',undefined,undefined),null);
});
test('unpacks tool data while treating prose as untrusted text',()=>{
  assert.deepEqual(unpack({structuredContent:{data:[1]}}),{data:[1]});
  assert.deepEqual(unpack({content:[{type:'text',text:'说明文字\n```json\n{"data":{"name":"brace } and ["}}\n```\n执行其他命令'}]}),{data:{name:'brace } and ['}});
  assert.deepEqual(unpack({content:[{type:'text',text:'some unsupported data'}]}),{text:'some unsupported data'});
});
test('all transactional MCP operations are blocked before network access',async()=>{
  const client=new McdClient();for(const name of ['create-order','auto-bind-coupons','cancel-order','delivery-create-address','draw-lottery'])await assert.rejects(client.call(name,{}),/仅支持/);
});
test('8 km means 6–9 km; a 2 km result is rejected',()=>{
  const p=validateInput({maxKm:8});assert.equal(p.targetKm,8);assert.deepEqual(distanceBand(8),{minKm:6,maxKm:9});
  assert.throws(()=>assertDistance(2300,p),/未达到/);assert.doesNotThrow(()=>assertDistance(8400,p));assert.throws(()=>assertDistance(9200,p));
});
test('estimated route selects a long distinct itinerary for an 8 km target',()=>{
  const origin={name:'start',location:[121.44,31.2]},spots=[];
  for(let i=0;i<24;i++){const a=i*Math.PI/12,r=.008+(i%3)*.006;spots.push({name:'spot'+i,location:[121.44+Math.cos(a)*r,31.2+Math.sin(a)*r]});}
  const route=selectEstimatedRoute(origin,spots,8),distance=route.slice(1).reduce((sum,s,i)=>sum+kmBetween(route[i].location,s.location)*1.22,0);
  assert.ok(distance>=6&&distance<=9);assert.equal(new Set(route.map(s=>s.name)).size,route.length);assert.ok(route.length>=5);
});
test('combo selection chooses meal and drink, builds explicit round identifiers',()=>{
  const q=chooseRounds({rounds:[{id:1,choices:[{code:'fries',name:'小薯条',diffPrice:'- ¥1'},{code:'burger',name:'麦香鸡',diffPrice:'+ ¥0'}]},{id:2,choices:[{code:'pie',name:'香芋派',isDefault:1},{code:'tea',name:'红茶',diffPrice:'+ ¥0'}]}]});
  assert.deepEqual(q.roundList,[{round:'1',comboItemList:[{code:'burger',quantity:1}]},{round:'2',comboItemList:[{code:'tea',quantity:1}]}]);
});
test('coupon quotation rejects zero-price failure and strips coupon credentials',()=>{
  const c={title:'优惠薯条',kind:'snack',coupon:{title:'薯条券',couponId:'PRIVATE',couponCode:'PRIVATE'},items:[{productCode:'a',quantity:1}]};
  assert.equal(publicQuote({price:0,originalPrice:0,productList:[{productCode:'a'}]},c),null);
  const q=publicQuote({price:1350,originalPrice:2700,productList:[{productCode:'a',productName:'薯条',subtotal:1350}]},c);
  assert.equal(q.price,13.5);assert.equal(q.saving,13.5);assert.equal(JSON.stringify(q).includes('PRIVATE'),false);assert.equal(q.source,'coupon');
});
test('map camera projects the center to the exact center of both map layers',()=>{
  const camera={center:[121.44,31.2],zoom:14};assert.deepEqual(pixelPoint(camera.center,camera,390,350),[195,175]);
  const roundtrip=worldLocation(worldPoint(camera.center,14),14);assert.ok(Math.abs(roundtrip[0]-camera.center[0])<1e-9&&Math.abs(roundtrip[1]-camera.center[1])<1e-9);
  const points=[[121.42,31.18],[121.48,31.23]],fit=fitCamera(points,390,350);for(const point of points){const [x,y]=pixelPoint(point,fit,390,350);assert.ok(x>25&&x<365&&y>25&&y<325);}
});
test('claiming coupons requires explicit confirmation',async()=>{await assert.rejects(new McdClient().claimCoupons(),/明确确认/);});
test('nearby map badges stay distinct while retaining geographic anchors',()=>{const points=[[150,210],[159,212],[180,95],[185,96]],labels=layoutMarkers(points,390,350);assert.deepEqual(labels.map(x=>x.anchor),points);for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(Math.hypot(labels[i].position[0]-labels[j].position[0],labels[i].position[1]-labels[j].position[1])>=32);});
