import {livePlan} from '../lib/planner.mjs';
import {demoPlan} from '../public/data.js';
try {
  if(process.argv.includes('--demo'))console.log(JSON.stringify(demoPlan(),null,2));
  else if(process.argv.includes('--stdin')){
    let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>4096)throw new Error('输入过大');}
    console.log(JSON.stringify(await livePlan(JSON.parse(raw)),null,2));
  }else throw new Error('使用 --demo 或 --stdin');
}catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;}
