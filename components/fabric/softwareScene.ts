import * as THREE from 'three';
import type {SceneState} from './Scene';
import type {Packet} from '@/lib/fabric/simulator';
import type {Link} from '@/lib/fabric/topology';
// CPU perspective renderer for browsers without WebGL. Uses the same graph and traces.
export function softwareScene(root:HTMLElement,state:React.RefObject<SceneState>,actions:React.RefObject<{onSelect:(id:number)=>void;onPacket:(p:Packet)=>void;onReady:(ok:boolean)=>void}>){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx){actions.current.onReady(false);return()=>{}}const g=ctx;root.appendChild(canvas);root.dataset.renderer='software-3d';const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let revision=-1,oldSim=state.current.sim,signature='';let w=1,h=1,raf=0,last=0,morph=0,mode='',az=.7,elevation=.55,distance=132,targetAz=.7,targetElev=.55,targetDist=132;const center=new THREE.Vector3(0,3,0),targetCenter=center.clone();let drag=false,followAllowed=true,px=0,py=0,moved=0,selection=-99;const camera=new THREE.PerspectiveCamera(42,1,.1,500);const positions:THREE.Vector3[]=[];let packetPoints:{x:number;y:number;p:Packet}[]=[];let projected:{x:number;y:number;d:number;id:number}[]=[];const colors={low:'#477c90',mid:'#74e6cf',hot:'#ffc078',failed:'#ff666d'};let labelRects:{x:number;y:number;w:number;h:number}[]=[];
 function label(text:string,x:number,y:number,color='#b8cdd6',force=false){const width=text.length*6.4+12;const rect={x:x-5,y:y-15,w:width,h:20};if(!force&&labelRects.some(r=>r.x<rect.x+rect.w&&r.x+r.w>rect.x&&r.y<rect.y+rect.h&&r.y+r.h>rect.y))return;labelRects.push(rect);g.globalAlpha=.92;g.fillStyle='#09151de6';g.fillRect(rect.x,rect.y,rect.w,rect.h);g.font='11px monospace';g.fillStyle=color;g.fillText(text,x,y);}
 const resize=()=>{w=root.clientWidth;h=root.clientHeight;const d=Math.min(devicePixelRatio,2);canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';g.setTransform(d,0,0,d,0,0);camera.aspect=w/h;camera.updateProjectionMatrix();mode=''};const ob=new ResizeObserver(resize);ob.observe(root);resize();
 function project(p:THREE.Vector3){const v=p.clone().project(camera);return {x:(v.x*.5+.5)*w,y:(-v.y*.5+.5)*h,d:p.distanceTo(camera.position)}}
 function line(a:THREE.Vector3,b:THREE.Vector3,color:string,alpha:number,width=1){const aa=project(a),bb=project(b);if(aa.d>240||bb.d>240)return;g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(aa.x,aa.y);g.lineTo(bb.x,bb.y);g.stroke()}
 function point(a:THREE.Vector3,color:string,r=2,alpha=1){const p=project(a);g.globalAlpha=alpha;g.fillStyle=color;g.beginPath();g.arc(p.x,p.y,r,0,7);g.fill()}
 function polygon(ps:THREE.Vector3[],fill:string,alpha:number,stroke='#3b505b'){const pts=ps.map(project);g.globalAlpha=alpha;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=.7;g.stroke()}
 function box(x:number,y:number,z:number,sx:number,sy:number,sz:number,alpha:number,color='#20303a'){
 const v=(xx:number,yy:number,zz:number)=>new THREE.Vector3(x+xx*sx/2,y+yy*sy/2,z+zz*sz/2);
 // Visible front/right/top faces. Opposite faces are kept for orbit correctness.
 const faces=[{ps:[v(-1,-1,1),v(1,-1,1),v(1,1,1),v(-1,1,1)],c:color,n:[0,0,1]}, {ps:[v(1,-1,1),v(1,-1,-1),v(1,1,-1),v(1,1,1)],c:'#172932',n:[1,0,0]}, {ps:[v(-1,-1,-1),v(-1,-1,1),v(-1,1,1),v(-1,1,-1)],c:'#1a2b34',n:[-1,0,0]}, {ps:[v(1,-1,-1),v(-1,-1,-1),v(-1,1,-1),v(1,1,-1)],c:'#15242c',n:[0,0,-1]}, {ps:[v(-1,1,1),v(1,1,1),v(1,1,-1),v(-1,1,-1)],c:'#425864',n:[0,1,0]}];
 for(const f of faces){if(new THREE.Vector3(...f.n as [number,number,number]).dot(camera.position.clone().sub(new THREE.Vector3(x,y,z)))>0)polygon(f.ps,f.c,alpha)}
 }
 function change(st:SceneState){followAllowed=true;const n=st.sim.t.nodes[st.selectedNode??0]||st.sim.t.nodes[0],p=new THREE.Vector3(...n.pos);if(st.mode==='rack'){targetCenter.copy(p).add(new THREE.Vector3(0,-3,0));targetDist=24;targetElev=.3;targetAz=.5}else if(st.mode==='packet'){targetCenter.copy(p);targetDist=46;targetElev=.48;targetAz=.6}else if(st.mode==='graph'){targetCenter.set(0,10,0);targetDist=125;targetElev=.55;targetAz=0}else if(st.mode==='fabric'){targetCenter.set(0,7,0);targetDist=132;targetElev=.85;targetAz=.55}else{targetCenter.set(0,3,0);targetDist=132;targetElev=.55;targetAz=.7}if(['system','fabric','graph'].includes(st.mode))targetDist*=Math.max(1,1.3/camera.aspect);mode=st.mode;selection=st.selectedNode??-1}
 function visible(l:Link,st:SceneState){return st.filter==='all'||st.filter===l.kind||(st.filter==='congested'&&l.directions.some(p=>p.bytes>st.sim.c.bufferKiB*256))||(st.filter==='failed'&&(l.failed||l.factor<1))||(st.filter==='plane0'&&l.plane===0)||(st.filter==='plane1'&&l.plane===1)}
 function curve(l:Link,st:SceneState){const anchor=(id:number)=>{const n=st.sim.t.nodes[id],adj=st.sim.t.adj[id],index=adj.findIndex(e=>e.link===l.id),p=positions[id].clone();if(n.kind!=='endpoint'){p.x+=(index-(adj.length-1)/2)*.26;p.z+=.84;p.y-=.06}return p};const a=anchor(l.a),b=anchor(l.b),mid=a.clone().lerp(b,.5);mid.y+=(l.kind==='global'?(st.sim.t.kind==='dragonfly'?8:3):l.kind==='local'?3:.5)*(1-morph*.85);return new THREE.QuadraticBezierCurve3(a,mid,b)}
 function frame(t:number){raf=requestAnimationFrame(frame);const st=state.current;if(!st||document.hidden)return;const dt=Math.min(.05,(t-last)/1000)||.016;root.dataset.fps=String(Math.round(1000/Math.max(1,t-last)));last=t;if(st.sim!==oldSim||st.viewRevision!==revision||st.mode!==mode||(st.mode==='rack'&&(st.selectedNode??-1)!==selection)){oldSim=st.sim;revision=st.viewRevision;change(st)}if(followAllowed&&st.mode==='packet'&&st.microscope&&st.selectedPacket&&positions.length){const hop=st.selectedPacket.hops.find(h=>st.microTime>=h.enqueue&&st.microTime<=(h.end||Infinity)+st.sim.c.hopUs);if(hop){const l=st.sim.t.links[hop.link];let f=Math.max(0,Math.min(1,(st.microTime-hop.start)/Math.max(.001,hop.end-hop.start+st.sim.c.hopUs)));if(hop.from===l.b)f=1-f;targetCenter.copy(curve(l,st).getPoint(f))}}
 const f=reduced?1:1-Math.exp(-3.5*dt);distance+=(targetDist-distance)*f;az+=(targetAz-az)*f;elevation+=(targetElev-elevation)*f;center.lerp(targetCenter,f);morph+=((st.mode==='graph'?1:0)-morph)*f;camera.position.copy(center).add(new THREE.Vector3(Math.sin(az)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(az)*Math.cos(elevation)*distance));camera.lookAt(center);camera.updateMatrixWorld();const next=[st.sim.time,st.mode,st.filter,st.classFilter,st.rankFilter,st.selectedNode,st.selectedPacket?.id,st.microTime,st.xray,st.viewRevision,az.toFixed(4),elevation.toFixed(4),distance.toFixed(3),center.x.toFixed(3),center.y.toFixed(3),center.z.toFixed(3),morph.toFixed(4),w,h].join('|');if(signature===next)return;signature=next;
 labelRects=[];g.globalAlpha=1;g.fillStyle='#070e13';g.fillRect(0,0,w,h);const bg=g.createRadialGradient(w*.51,h*.59,10,w*.51,h*.55,w*.5);bg.addColorStop(0,'#172f3d');bg.addColorStop(.65,'#0d1a23');bg.addColorStop(1,'#070e13');g.fillStyle=bg;g.fillRect(0,0,w,h);
 for(let i=-100;i<=100;i+=5){const alpha=i%20===0?.4:.18;line(new THREE.Vector3(i,-.5,-75),new THREE.Vector3(i,-.5,75),'#345160',alpha);if(i>=-75&&i<=75)line(new THREE.Vector3(-100,-.5,i),new THREE.Vector3(100,-.5,i),'#345160',alpha)}
 for(const n of st.sim.t.nodes)positions[n.id]=new THREE.Vector3(...n.pos).lerp(new THREE.Vector3(...n.graph),morph);
 const fade=st.xray||st.mode==='fabric'||st.mode==='graph'?.10:st.mode==='packet'?.25:1;
 // Raised cabinet islands and cold aisles establish physical scale without adding simulated nodes.
 if(morph<.95)for(let group=0;group<8;group++){const x=(group%4-1.5)*22,z=(Math.floor(group/4)-.5)*27;
 box(x,-.28,z,12.7,.35,17,fade*.8,'#243643');
 polygon([new THREE.Vector3(x-5,-.08,z-1.35),new THREE.Vector3(x+5,-.08,z-1.35),new THREE.Vector3(x+5,-.08,z+1.35),new THREE.Vector3(x-5,-.08,z+1.35)],'#39677b',fade*.5);
 line(new THREE.Vector3(x-6.35,-.05,z-8.5),new THREE.Vector3(x+6.35,-.05,z-8.5),'#75aebe',fade*.7,1.5);
 for(const zz of [-8.5,8.5])for(const xx of [-6.35,6.35])line(new THREE.Vector3(x+xx,-.05,z+zz),new THREE.Vector3(x+xx,-.05,z+zz-Math.sign(zz)*2),'#99c8d3',fade*.75,1.5);
 }

 const racks=st.sim.t.nodes.filter(n=>n.kind==='switch').sort((a,b)=>new THREE.Vector3(...b.pos).distanceTo(camera.position)-new THREE.Vector3(...a.pos).distanceTo(camera.position));
 for(const n of racks){const [x,,z]=n.pos;
 polygon([new THREE.Vector3(x-1.8,-.06,z-1.7),new THREE.Vector3(x+2.3,-.06,z-1.7),new THREE.Vector3(x+3.5,-.06,z+3),new THREE.Vector3(x-1.2,-.06,z+3)],'#02080c',fade*.5);
 box(x,3,z,2.85,6.8,3,fade,'#344957');
 if(fade>.2){const front=camera.position.z>z,zz=z+(front?1.52:-1.52);
 polygon([new THREE.Vector3(x-1.22,-.1,zz),new THREE.Vector3(x+1.22,-.1,zz),new THREE.Vector3(x+1.22,6.18,zz),new THREE.Vector3(x-1.22,6.18,zz)],'#07121a',fade);
 for(let k=0;k<16;k++){const y=k*.37+.12;
 polygon([new THREE.Vector3(x-1.1,y,zz+.015),new THREE.Vector3(x+1.1,y,zz+.015),new THREE.Vector3(x+1.1,y+.23,zz+.015),new THREE.Vector3(x-1.1,y+.23,zz+.015)],k%4===0?'#4a626d':'#263c49',fade*.95,'#456371');
 for(let j=0;j<4;j++)point(new THREE.Vector3(x-.9+j*.5,y+.12,zz+.04),j===0?'#d4ec9a':'#6fdac5',distance<45?1.3:.7,fade*.85);
 }
 for(const xx of [-1.32,1.32])line(new THREE.Vector3(x+xx,-.25,zz),new THREE.Vector3(x+xx,6.35,zz),'#88acbc',fade*.75,1.1);
 line(new THREE.Vector3(x+.95,2.6,zz+.06),new THREE.Vector3(x+.95,3.4,zz+.06),'#d0dee3',fade,1.4);
 box(x,6.2,z,2.9,.32,3.08,fade,'#536c77');for(const xx of [-1.2,1.2])line(new THREE.Vector3(x+xx,6.4,z),new THREE.Vector3(x+xx,7.7,z),'#a2bdc9',fade*.8,1.2);
 if(distance<60){const a=project(new THREE.Vector3(x-.9,6.4,zz));label(n.label,a.x,a.y,'#c3d9dc')}
 }
 }
 const critical=new Set(st.sim.lastStats.critical.map((x:number[])=>x[0]));

 for(const l of st.sim.t.links){if(!visible(l,st))continue;if(st.rankFilter>=0){const paths=st.sim.visual.filter(p=>p.src===st.rankFilter||p.dst===st.rankFilter);if(!paths.some(p=>p.path.includes(l.a)&&p.path.includes(l.b)))continue}const q=Math.max(...l.directions.map(p=>p.bytes))/(st.sim.c.bufferKiB*1024),hot=l.failed||l.factor<1;let color=hot?colors.failed:q>.25?colors.hot:l.util>.2?colors.mid:st.mode==='graph'?'#6b9bae':colors.low;let alpha=hot?.95:(st.mode==='graph'?(l.kind==='endpoint'?.22:.7):st.xray?.50:.26)+Math.max(l.util,q)*.5;let width=hot?1.8:Math.max(l.util,q)>.2?1.35:.7;
 if((st.mode==='packet'||st.focusRoute)&&st.selectedPacket){const sel=st.selectedPacket.hops.some(h=>h.link===l.id);alpha=sel?1:.04;if(sel){color='#d6fff0';width=2}}
 if(st.mode==='graph'&&!st.focusRoute&&critical.has(l.id)&&!hot){color='#8bbaff';width=2.2;alpha=.9}
 const pts=curve(l,st).getPoints(24);g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();pts.forEach((p,i)=>{const a=project(p);if(i)g.lineTo(a.x,a.y);else g.moveTo(a.x,a.y)});if(hot){g.shadowColor=color;g.shadowBlur=10}g.stroke();g.shadowBlur=0;
 }
 projected=[];for(const n of st.sim.t.nodes){const p=project(positions[n.id]);projected.push({...p,id:n.id});const q=Math.max(0,...st.sim.t.adj[n.id].map(e=>st.sim.t.links[e.link].directions[e.dir].bytes));const color=q>st.sim.c.bufferKiB*256?colors.hot:colors.mid;if(n.kind==='endpoint'){if(st.mode==='rack'||st.mode==='packet'){const pos=positions[n.id];box(pos.x,pos.y,pos.z,.85,.32,.65,.8,'#488577');point(pos.clone().add(new THREE.Vector3(.3,.18,.33)),'#d6f79f',1.6,.9)}else point(positions[n.id],color,1.1,st.mode==='system'?.25:.65)}else{
 const pos=positions[n.id];if(st.mode!=='graph')box(pos.x,pos.y,pos.z,2.6,.48,1.55,st.mode==='system'?.9:.6,'#45697b');
 if(st.mode==='rack'||st.mode==='packet'){const adj=st.sim.t.adj[n.id];for(let j=0;j<adj.length;j++)point(pos.clone().add(new THREE.Vector3((j-(adj.length-1)/2)*.26,-.06,.84)),st.sim.t.links[adj[j].link].factor<1?'#ff6e74':'#c6e9d7',1.8,.9)}
g.globalAlpha=.95;g.fillStyle=color;g.shadowColor=color;g.shadowBlur=7;g.fillRect(p.x-3,p.y-2,6,4);g.shadowBlur=0;if(st.mode==='graph'||st.mode==='rack')label(n.label,p.x+9,p.y-9)}if(st.selectedNode===n.id){g.globalAlpha=.85;g.strokeStyle='#dafd9c';g.lineWidth=1;g.beginPath();g.ellipse(p.x,p.y,14,6,0,0,7);g.stroke()}}
 if(st.mode!=='system'&&st.mode!=='packet'){
 const qs=st.sim.t.nodes.filter(n=>n.kind!=='endpoint').map(n=>({n,bytes:Math.max(0,...st.sim.t.adj[n.id].map(a=>st.sim.t.links[a.link].directions[a.dir].bytes))}));const top=qs.filter(q=>q.bytes>16384).sort((a,b)=>b.bytes-a.bytes).slice(0,2);
 for(const q of qs){if(q.bytes<1024)continue;const pos=positions[q.n.id],height=q.bytes/(st.sim.c.bufferKiB*1024)*7;
 box(pos.x+2,pos.y+height/2,pos.z,.5,height,.5,.85,'#ffc078');line(new THREE.Vector3(pos.x+2,pos.y,pos.z),new THREE.Vector3(pos.x+2,pos.y+7,pos.z),'#ffcc85',.2);
 if(top.includes(q)){const screen=project(new THREE.Vector3(pos.x+2,pos.y+height+.8,pos.z));label(`${Math.round(q.bytes/1024)} KiB queued`,screen.x+8,screen.y,'#ffce96')}
 }
 }
 packetPoints=[];const list=st.microscope&&st.selectedPacket?[st.selectedPacket]:st.sim.visual;for(const p of list){if(st.classFilter==='latency'&&p.cls!==1||st.classFilter==='bulk'&&p.cls!==0)continue;if(st.rankFilter>=0&&p.src!==st.rankFilter&&p.dst!==st.rankFilter)continue;const clock=st.microscope?st.microTime:st.sim.time,hop=p.hops.find(h=>clock>=h.enqueue&&clock<=(h.end||Infinity)+st.sim.c.hopUs);if(!hop)continue;const l=st.sim.t.links[hop.link];let f=hop.end?Math.max(0,Math.min(1,(clock-hop.start)/Math.max(.001,hop.end-hop.start+st.sim.c.hopUs))):0;if(hop.from===l.b)f=1-f;const pp=project(curve(l,st).getPoint(f));packetPoints.push({x:pp.x,y:pp.y,p});
 // Trail lies behind the packet along its actual direction of travel; it stops while queued.
 if(hop.end&&clock>=hop.start){const direction=hop.from===l.b?-1:1;const c=curve(l,st);for(let trail=1;trail<=6;trail++){const back=f-direction*trail*.015;if(back<0||back>1)break;const q=project(c.getPoint(back));g.globalAlpha=(1-trail/7)*.65;g.strokeStyle=p.cls?'#f0ffbd':'#8cf8df';g.lineWidth=st.microscope?3:1.6;const prev=project(c.getPoint(Math.max(0,Math.min(1,back+direction*.015))));g.beginPath();g.moveTo(q.x,q.y);g.lineTo(prev.x,prev.y);g.stroke()}}
 g.shadowBlur=12;g.shadowColor='#aeffe1';point(curve(l,st).getPoint(f),p.cls?'#e8ffb7':'#aeffe1',st.microscope?4:2.1);g.shadowBlur=0}
 if(st.mode==='system'||st.mode==='fabric'){for(let j=0;j<8;j++){const p=project(new THREE.Vector3((j%4-1.5)*22,.2,(Math.floor(j/4)-.5)*27+9));g.globalAlpha=.7;g.fillStyle='#72919e';g.textAlign='center';g.font='11px monospace';g.fillText(`G${j} / 4 SWITCHES`,p.x,p.y);g.textAlign='left'}}
 g.globalAlpha=1;
 }
 const down=(e:PointerEvent)=>{drag=true;followAllowed=false;px=e.clientX;py=e.clientY;moved=0;canvas.setPointerCapture(e.pointerId)},move=(e:PointerEvent)=>{if(!drag)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);targetAz-=dx*.007;targetElev=THREE.MathUtils.clamp(targetElev+dy*.006,.08,1.42)},up=(e:PointerEvent)=>{drag=false;if(moved<5){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const ph=packetPoints.find(p=>Math.hypot(p.x-x,p.y-y)<9);if(ph){actions.current.onPacket(ph.p);return}const candidates=projected.map(p=>({...p,dist:Math.hypot(p.x-x,p.y-y)})).filter(p=>p.dist<12).sort((a,b)=>a.dist-b.dist);if(candidates.length)actions.current.onSelect(candidates[0].id)}},wheel=(e:WheelEvent)=>{e.preventDefault();targetDist=THREE.MathUtils.clamp(targetDist*Math.exp(e.deltaY*.001),8,200)};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('wheel',wheel,{passive:false});raf=requestAnimationFrame(frame);actions.current.onReady(true);
 return()=>{cancelAnimationFrame(raf);ob.disconnect();canvas.remove()};
}
