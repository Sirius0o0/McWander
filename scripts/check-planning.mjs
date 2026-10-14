import {livePlan} from '../lib/planner.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const target=Number(process.argv[2]||8);
try{
  const plan=await livePlan({city:'上海',start:'武康大楼',targetKm:target,hours:3,budget:25,departure:'14:00',interests:['architecture','photo']});
  await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/plan-${target}km.json`,JSON.stringify(plan,null,2));
  console.log(JSON.stringify({distance:plan.distance,minutes:plan.totalMinutes,stops:plan.stops.map(s=>s.name),meal:{price:plan.meal.price,title:plan.meal.title,contents:plan.meal.contents,options:plan.meal.options.map(x=>({title:x.title,kind:x.kind,price:x.price,saving:x.saving,source:x.source}))}}));
}catch(e){console.log(JSON.stringify({error:e.message}));process.exitCode=1;}
