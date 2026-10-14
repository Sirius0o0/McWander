const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function worldPoint([lon,lat],zoom){const size=256*2**zoom,sin=Math.sin(clamp(lat,-85,85)*Math.PI/180);return [(lon+180)/360*size,(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*size];}
export function worldLocation([x,y],zoom){const size=256*2**zoom;return [x/size*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/size)))*180/Math.PI];}
export function pixelPoint(location,camera,width,height){const p=worldPoint(location,camera.zoom),c=worldPoint(camera.center,camera.zoom);return [width/2+p[0]-c[0],height/2+p[1]-c[1]];}
export function fitCamera(points,width,height,padding=44){
  const projected=points.map(p=>worldPoint(p,0)),xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const zoom=clamp(Math.floor(Math.log2(Math.min((width-padding*2)/Math.max(.00001,maxX-minX),(height-padding*2)/Math.max(.00001,maxY-minY)))),10,17);
  return {center:worldLocation([(minX+maxX)/2,(minY+maxY)/2],0),zoom};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function layoutMarkers(points,width,height){
  const placed=[];const offsets=[[0,0],[0,-34],[34,0],[-34,0],[0,34],[26,-26],[-26,-26],[26,26],[-26,26],[0,-65],[65,0],[-65,0],[0,65]];
  return points.map(([x,y])=>{let chosen=[x,y];for(const [dx,dy]of offsets){const px=x+dx,py=y+dy;if(px<17||px>width-17||py<17||py>height-22||(px>width-58&&py<130))continue;if(placed.every(p=>Math.hypot(p[0]-px,p[1]-py)>=32)){chosen=[px,py];break;}}placed.push(chosen);return {anchor:[x,y],position:chosen};});
}
export class RouteMap{
  constructor(root,onSelect){this.root=root;this.onSelect=onSelect;this.pointers=new Map();this.selected=0;this.resize=new ResizeObserver(()=>{if(this.plan)this.render();});this.resize.observe(root);this.bindGestures();}
  setPlan(plan,selected=0){this.plan=plan;this.selected=selected;this.camera=null;this.fit();}
  size(){return {width:Math.round(this.root.clientWidth||350),height:Math.round(this.root.clientHeight||350)};}
  fit(){if(!this.plan)return;const {width,height}=this.size();if(this.plan.mode==='live'){const points=this.plan.coordinates?.length?this.plan.coordinates:this.plan.stops.map(s=>s.location);this.camera=fitCamera(points,width,height);}this.render();}
  zoom(delta){if(this.plan.mode!=='live')return;this.camera.zoom=clamp(this.camera.zoom+delta,10,17);this.render();}
  select(index){this.selected=index;this.root.querySelectorAll('[data-map-stop]').forEach(el=>el.classList.toggle('selected',Number(el.dataset.mapStop)===index));}
  render(){
    if(!this.plan)return;const p=this.plan,{width,height}=this.size();this.root.classList.toggle('is-demo',p.mode==='demo');
    let points,line;
    if(p.mode==='live'){if(!this.camera)this.camera=fitCamera(p.coordinates,width,height);const pixel=s=>pixelPoint(s,this.camera,width,height);points=p.stops.map(s=>pixel(s.location));line=p.coordinates.map(pixel);}
    else{points=p.stops.map(s=>[(s.point[0]/660)*(width-30)+15,(s.point[1]/470)*(height-40)+20]);line=points;}
    const route=line.map(x=>x.map(n=>n.toFixed(1)).join(',')).join(' ');
    const pins=layoutMarkers(points,width,height).map(({anchor:[ax,ay],position:[x,y]},i)=>`${Math.hypot(x-ax,y-ay)>1?`<path d="M${ax} ${ay}L${x} ${y}" stroke="#9d8b63" stroke-width="1"/><circle cx="${ax}" cy="${ay}" r="3" fill="#6f5000" stroke="white" stroke-width="1"/>`:''}<g data-map-stop="${i}" class="route-pin ${i===this.selected?'selected':''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" role="button" tabindex="0" aria-label="${i+1}. ${escape(p.stops[i].name)}"><circle class="pin-focus" r="20"/><circle r="13" fill="${p.stops[i].kind==='mcd'?'#c62828':'#6f5000'}" stroke="#fffdf5" stroke-width="2.5"/><text y="4" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif" font-weight="600">${i+1}</text></g>`).join('');
    let decoration='';if(p.mode==='demo'){
      let blocks='';for(let row=0;row<5;row++)for(let col=0;col<6;col++)blocks+=`<rect x="${col*74-20}" y="${row*82-15}" width="52" height="57" rx="4" fill="${(row+col)%3?'#eae6da':'#e1e3d4'}"/>`;
      decoration=`<rect width="${width}" height="${height}" fill="#f6f3e9"/><g transform="rotate(-22 ${width/2} ${height/2})">${blocks}<path d="M-50 165H700" stroke="#fffaf0" stroke-width="16"/><path d="M-50 165H700" stroke="#e4d9ba" stroke-width="1"/></g><path d="M${width-130} 0h130v75q-55 30-95-2Z" fill="#dfe7d2"/><path d="M${width-100} 13q20 32 74 38" fill="none" stroke="#f3f6eb" stroke-width="5"/>`;
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" class="map-overlay" viewBox="0 0 ${width} ${height}" aria-label="${p.mode==='live'?'高德步行路线':'示例路线'}">${decoration}<polyline points="${route}" fill="none" stroke="#fffdf5" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${route}" fill="none" stroke="#6f5000" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${pins}</svg>`;
    const image=p.mode==='live'&&p.mapUrl?`<img class="map-base" alt="高德地图底图" draggable="false">`:'';
    this.root.innerHTML=`<div class="map-transform">${image}${svg}</div><span class="map-status">${p.mode==='demo'?'示例路线 · 非导航地图':'高德地图'}</span>`;
    const img=this.root.querySelector('img');
    if(img){const url=new URL(p.mapUrl,location.origin);url.searchParams.set('width',width);url.searchParams.set('height',height);url.searchParams.set('zoom',this.camera.zoom);url.searchParams.set('center',this.camera.center.map(x=>x.toFixed(6)).join(','));img.src=url;img.onerror=()=>{this.root.querySelector('.map-status').textContent='底图暂不可用 · 路线仍可查看';};}
    this.root.querySelectorAll('[data-map-stop]').forEach(el=>{const select=()=>this.onSelect(Number(el.dataset.mapStop));el.addEventListener('click',select);el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select();}});});
  }
  bindGestures(){
    const root=this.root;
    root.addEventListener('pointerdown',e=>{if(this.plan?.mode!=='live'||e.target.closest('[data-map-stop]'))return;root.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===1){this.initial={x:e.clientX,y:e.clientY};this.drag={x:0,y:0};}if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);this.scale=1;}});
    root.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const layer=root.querySelector('.map-transform');if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.scale=Math.hypot(a.x-b.x,a.y-b.y)/this.pinch;if(layer)layer.style.transform=`scale(${this.scale})`;}else if(this.initial){this.drag={x:e.clientX-this.initial.x,y:e.clientY-this.initial.y};if(layer)layer.style.transform=`translate(${this.drag.x}px,${this.drag.y}px)`;}});
    const finish=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.delete(e.pointerId);if(this.pointers.size)return;if(this.pinch){this.camera.zoom=clamp(this.camera.zoom+Math.round(Math.log2(this.scale||1)),10,17);}else if(this.drag){const c=worldPoint(this.camera.center,this.camera.zoom);this.camera.center=worldLocation([c[0]-this.drag.x,c[1]-this.drag.y],this.camera.zoom);}this.pinch=null;this.initial=null;this.render();};root.addEventListener('pointerup',finish);root.addEventListener('pointercancel',finish);
  }
}
