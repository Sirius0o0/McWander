export const interests=[{id:'architecture',label:'街巷建筑',icon:'building'},{id:'nature',label:'公园绿意',icon:'leaf'},{id:'culture',label:'人文艺术',icon:'book'},{id:'photo',label:'沿途摄影',icon:'camera'}];
export const presets=[
  {id:'shanghai',city:'上海',title:'武康路—安福路',subtitle:'梧桐树影与老洋房',theme:'街区步行',start:'武康大楼',distance:3.2,walkingMinutes:48,detourMinutes:5,color:'sage',stops:[
    {name:'武康大楼',kind:'spot',description:'从这座船形老建筑出发，抬头看看转角的光。',stay:20,time:'14:00',walkMinutes:0,point:[135,375]},
    {name:'武康路',kind:'spot',description:'沿梧桐树影走一段，喜欢的街角就停下来。',stay:25,time:'14:30',walkMinutes:10,point:[240,270]},
    {name:'麦当劳 · 午后休息站',kind:'mcd',description:'给脚步放个小假，吃点喜欢的再继续出发。',stay:25,time:'15:10',walkMinutes:15,point:[385,250]},
    {name:'安福路',kind:'spot',description:'逛逛街边小店，把最后一段留给不经意的发现。',stay:35,time:'15:45',walkMinutes:10,point:[440,135]},
    {name:'静安公园',kind:'spot',description:'在绿意里收尾，今天走到这里就刚刚好。',stay:15,time:'16:33',walkMinutes:13,point:[540,95]}
  ]},
  {id:'hangzhou',city:'杭州',title:'西湖—河坊街',subtitle:'湖风、柳色与老街',theme:'湖畔步行',start:'柳浪闻莺',distance:3.8,walkingMinutes:57,detourMinutes:6,color:'blue',stops:[
    {name:'柳浪闻莺',kind:'spot',description:'听听鸟鸣，沿着柳树下的步道出发。',stay:20,time:'14:00',walkMinutes:0,point:[140,380]},
    {name:'西湖天地',kind:'spot',description:'看湖，也看看路边的风景。',stay:20,time:'14:35',walkMinutes:15,point:[250,265]},
    {name:'麦当劳 · 湖畔休息站',kind:'mcd',description:'坐一会儿，为接下来的小街巷补充能量。',stay:25,time:'15:10',walkMinutes:15,point:[370,235]},
    {name:'河坊街',kind:'spot',description:'穿过街巷，找一点属于杭州的日常。',stay:35,time:'15:50',walkMinutes:15,point:[460,140]},
    {name:'南宋御街',kind:'spot',description:'把午后的最后一段留给老街。',stay:15,time:'16:37',walkMinutes:12,point:[540,95]}
  ]},
  {id:'chengdu',city:'成都',title:'人民公园—宽窄巷子',subtitle:'青砖小巷与公园日常',theme:'街区步行',start:'人民公园',distance:2.9,walkingMinutes:44,detourMinutes:4,color:'peach',stops:[
    {name:'人民公园',kind:'spot',description:'从公园里的慢生活，开始今天的散步。',stay:25,time:'14:00',walkMinutes:0,point:[135,375]},
    {name:'祠堂街',kind:'spot',description:'在街边看看小展，偶遇一段城市故事。',stay:25,time:'14:35',walkMinutes:10,point:[245,265]},
    {name:'麦当劳 · 街角休息站',kind:'mcd',description:'安逸坐一会儿，把午后留给自己。',stay:25,time:'15:12',walkMinutes:12,point:[375,240]},
    {name:'宽窄巷子',kind:'spot',description:'走进小巷，看看青砖和树影。',stay:40,time:'15:49',walkMinutes:12,point:[460,140]},
    {name:'小通巷',kind:'spot',description:'在不赶时间的街角，结束今天的漫步。',stay:15,time:'16:39',walkMinutes:10,point:[540,95]}
  ]}
];
export function demoPlan(id='shanghai',input={}) {
  const preset=presets.find(p=>p.id===id)||presets[0];const p=structuredClone(preset);
  p.mode='demo';p.input={city:p.city,start:p.start,hours:3,budget:25,targetKm:p.distance,maxKm:p.distance,departure:'14:00',interests:['architecture','photo'],...input};
  p.stops.forEach(s=>{s.description=s.kind==='mcd'?'示例休息站，未查询真实门店':'示例地点，未核验开放时间';if(s.kind==='mcd')s.name='麦当劳 · 示例休息站';});
  let elapsed=0;
  p.stops.forEach((s,i)=>{elapsed+=s.walkMinutes;const [h,m]=p.input.departure.split(':').map(Number);const t=h*60+m+elapsed;s.time=`${t>=1440?'次日 ':''}${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;elapsed+=s.stay;});
  p.totalMinutes=elapsed;
  const example={title:'随心配套餐',kind:'meal',source:'combo',price:13.9,originalPrice:13.9,contents:['鸡排','红茶'],items:[{name:'随心配套餐',price:13.9}],verified:false};
  p.meal={...example,options:[example,{title:'薯条优惠',kind:'snack',source:'coupon',price:13.5,originalPrice:27,contents:['薯条 ×2'],items:[{name:'薯条',price:13.5}],verified:false},{title:'美式咖啡',kind:'drink',source:'menu',price:11.9,originalPrice:11.9,contents:['美式咖啡'],items:[{name:'美式咖啡',price:11.9}],verified:false}],couponCount:0,availableCoupons:[],comparedCount:3,couponApplied:false,description:'示例价格'};
  p.notice='演示路线：地点顺序、地图连线、步行时间、休息站与价格均为示例，未核验真实路网、营业情况或库存，不用于实际导航。实时规划会使用你设置的地点与限制。';
  p.trace=[];return p;
}
