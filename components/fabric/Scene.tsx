'use client';
import React,{useEffect,useLayoutEffect,useRef} from 'react';
import {softwareScene} from './softwareScene';
import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Simulation,Packet} from '@/lib/fabric/simulator';
import type {Link} from '@/lib/fabric/topology';
type SceneMaterial=THREE.Material&{map?:THREE.Texture|null};
type DisposableObject=THREE.Object3D&{geometry?:THREE.BufferGeometry;material?:SceneMaterial|SceneMaterial[]};
export type ViewMode='system'|'fabric'|'rack'|'packet'|'graph';
export type SceneState={sim:Simulation;mode:ViewMode;xray:boolean;filter:string;classFilter:string;rankFilter:number;selectedNode:number|null;selectedPacket:Packet|null;quality:number;microscope:boolean;microTime:number;viewRevision:number;focusRoute?:boolean};
export default function Scene({state,onSelect,onPacket,onReady}:{state:React.RefObject<SceneState>;onSelect:(id:number)=>void;onPacket:(p:Packet)=>void;onReady:(ok:boolean)=>void}){
 const el=useRef<HTMLDivElement>(null);const actions=useRef({onSelect,onPacket,onReady});useLayoutEffect(()=>{actions.current={onSelect,onPacket,onReady}});
 useEffect(()=>{
  if(!el.current)return;const root=el.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{return softwareScene(root,state,actions)}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor('#070e13');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);root.dataset.renderer='webgl';const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#070e13',.006);const camera=new THREE.PerspectiveCamera(42,1,.1,450);camera.position.set(75,64,92);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxDistance=175;controls.minDistance=6;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,4,0);controls.enablePan=true;
  scene.add(new THREE.HemisphereLight('#bbdbec','#081018',2));const key=new THREE.DirectionalLight('#d2eeff',3);key.position.set(20,60,30);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-65,right:65,top:55,bottom:-55,near:.5,far:160});key.shadow.bias=-.0005;key.shadow.normalBias=.05;scene.add(key);const fill=new THREE.DirectionalLight('#4ad7b5',1);fill.position.set(-50,15,-30);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(220,160),new THREE.MeshStandardMaterial({color:'#0e1920',metalness:.75,roughness:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-.5;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(200,80,'#24424b','#152630');grid.position.y=-.46;scene.add(grid);
  const machine=new THREE.Group();scene.add(machine);const bodies=new THREE.Group();machine.add(bodies);const cableGroup=new THREE.Group();scene.add(cableGroup);
  let sim:Simulation|null=null;let nodeMeshes:THREE.Mesh[]=[];let wires:Line2[]=[];let wirePoints:THREE.Vector3[][]=[];let positions:THREE.Vector3[]=[];let tray:THREE.InstancedMesh|null=null;let lights:THREE.InstancedMesh|null=null;let ports:THREE.InstancedMesh|null=null;let labels:THREE.Sprite[]=[];
  const dummy=new THREE.Object3D();const sphereGeo=new THREE.BoxGeometry(.85,.32,.65);const switchGeo=new THREE.BoxGeometry(2.6,.48,1.55);
  const packetGeo=new THREE.SphereGeometry(.35,8,6);const packetMat=new THREE.MeshBasicMaterial({color:0xffffff});const packetMesh=new THREE.InstancedMesh(packetGeo,packetMat,400);packetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);packetMesh.frustumCulled=false;scene.add(packetMesh);
  const trailMesh=new THREE.InstancedMesh(packetGeo,new THREE.MeshBasicMaterial({color:'#71ddc8',transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending}),2400);trailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);trailMesh.frustumCulled=false;scene.add(trailMesh);
  const queueMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,1,.5),new THREE.MeshStandardMaterial({color:'#ffbd6c',emissive:'#ed9a45',emissiveIntensity:.55,transparent:true,opacity:.85}),200);queueMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);queueMesh.frustumCulled=false;scene.add(queueMesh);

  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.055,8,64),new THREE.MeshBasicMaterial({color:'#d5ff76'}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
  const colors={low:new THREE.Color('#275b69'),mid:new THREE.Color('#4de4b7'),high:new THREE.Color('#ffb85b'),hot:new THREE.Color('#ff5f63'),failed:new THREE.Color('#ec4964'),white:new THREE.Color('#e7fff8')};
  const tmpColor=new THREE.Color();const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();let lastMode='',morph=0,targetMorph=0;let cameraTransition=0,followAllowed=true;const targetCam=new THREE.Vector3(),targetLook=new THREE.Vector3();let drag=false;let downX=0,downY=0;let raf=0,lastT=0,frames=0,fpsTime=0;let oldSelected=-999,lastRevision=-1;let packetMap:Packet[]=[];
  function textSprite(text:string,color='#718d99'){const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d')!;ctx.font='500 26px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,256,40);const texture=new THREE.CanvasTexture(c);const m=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,opacity:.85});const s=new THREE.Sprite(m);s.scale.set(14,1.75,1);return s}
  function disposeGroup(group:THREE.Group){while(group.children.length){const o=group.children[0] as DisposableObject&{material?:SceneMaterial};group.remove(o);o.geometry?.dispose();if(o.material?.map)o.material.map.dispose();o.material?.dispose()}}
  function rebuild(s:Simulation){sim=s;disposeGroup(bodies);disposeGroup(cableGroup);for(const m of nodeMeshes){scene.remove(m);(m.material as THREE.Material).dispose()}nodeMeshes=[];wires=[];wirePoints=[];for(const l of labels){scene.remove(l);l.material.map?.dispose();l.material.dispose()}labels=[];
   if(tray){scene.remove(tray);tray.geometry.dispose();(tray.material as THREE.Material).dispose()}if(lights){scene.remove(lights);lights.geometry.dispose();(lights.material as THREE.Material).dispose()}
   if(ports){scene.remove(ports);ports.geometry.dispose();(ports.material as THREE.Material).dispose()}ports=new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.16,.16),new THREE.MeshStandardMaterial({color:'#b0c2c8',metalness:.85,roughness:.25,emissive:'#193e4c'}),s.t.links.length*2);scene.add(ports);
   positions=s.t.nodes.map(n=>new THREE.Vector3(...n.pos));
   const bodyMat=new THREE.MeshStandardMaterial({color:'#25353d',metalness:.8,roughness:.4,transparent:true,opacity:.95});
   tray=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,.24,2.25),new THREE.MeshStandardMaterial({color:'#455762',metalness:.7,roughness:.4,transparent:true}),32*16);scene.add(tray);
   lights=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.065,.045),new THREE.MeshBasicMaterial({color:'#75f4d0',transparent:true}),32*16*8);scene.add(lights);
   let ti=0,li=0;
   for(const n of s.t.nodes){if(n.kind==='switch'){
    const body=new THREE.Mesh(new THREE.BoxGeometry(2.85,6.8,3),bodyMat.clone());body.position.set(n.pos[0],3,n.pos[2]);body.castShadow=true;body.receiveShadow=true;bodies.add(body);
    const trimMat=new THREE.MeshStandardMaterial({color:'#7c939e',metalness:.85,roughness:.3,transparent:true});
    for(const x of [-1.34,1.34]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.11,6.55,.14),trimMat.clone());rail.position.set(n.pos[0]+x,3,n.pos[2]+1.53);bodies.add(rail)}
    for(const x of [-1.2,1.2]){const upright=new THREE.Mesh(new THREE.BoxGeometry(.09,1.5,.1),trimMat.clone());upright.position.set(n.pos[0]+x,7,n.pos[2]);bodies.add(upright)}
    const cap=new THREE.Mesh(new THREE.BoxGeometry(2.96,.25,3.1),trimMat.clone());cap.position.set(n.pos[0],6.25,n.pos[2]);cap.castShadow=true;bodies.add(cap);
    const handle=new THREE.Mesh(new THREE.BoxGeometry(.065,.85,.13),trimMat.clone());handle.position.set(n.pos[0]+1,3,n.pos[2]+1.6);bodies.add(handle);

    const front=new THREE.Mesh(new THREE.PlaneGeometry(2.45,6.3),new THREE.MeshStandardMaterial({color:'#061017',metalness:.7,roughness:.25,transparent:true,opacity:.9}));front.position.set(n.pos[0],3,n.pos[2]+1.19);bodies.add(front);
    for(let j=0;j<16;j++){dummy.position.set(n.pos[0],j*.37+.2,n.pos[2]+.08);dummy.scale.setScalar(1);dummy.updateMatrix();tray.setMatrixAt(ti++,dummy.matrix);for(let k=0;k<8;k++){dummy.position.set(n.pos[0]-.95+k*.26,j*.37+.21,n.pos[2]+1.24);dummy.updateMatrix();lights.setMatrixAt(li,dummy.matrix);lights.setColorAt(li++,k%3===0?colors.mid:colors.low)}}
   }
   const mat=new THREE.MeshStandardMaterial({color:n.kind==='endpoint'?'#53b6a7':'#62d6c4',emissive:n.kind==='endpoint'?'#16463a':'#257b65',emissiveIntensity:.8,metalness:.55,roughness:.3,transparent:true});const obj=new THREE.Mesh(n.kind==='endpoint'?sphereGeo:switchGeo,mat);obj.position.copy(positions[n.id]);obj.userData.id=n.id;scene.add(obj);nodeMeshes.push(obj);
   }
   for(let g=0;g<8;g++){const x=(g%4-1.5)*22,z=(Math.floor(g/4)-.5)*27;
    const pad=new THREE.Mesh(new THREE.BoxGeometry(12.7,.35,17),new THREE.MeshStandardMaterial({color:'#293e4d',metalness:.65,roughness:.55,transparent:true}));pad.position.set(x,-.28,z);pad.receiveShadow=true;bodies.add(pad);
    const aisle=new THREE.Mesh(new THREE.PlaneGeometry(10,2.7),new THREE.MeshStandardMaterial({color:'#386175',metalness:.3,roughness:.75,transparent:true}));aisle.rotation.x=-Math.PI/2;aisle.position.set(x,-.08,z);aisle.receiveShadow=true;bodies.add(aisle);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(12.7,.045,.06),new THREE.MeshBasicMaterial({color:'#78b6c9',transparent:true}));edge.position.set(x,-.05,z-8.5);bodies.add(edge);
    const l=textSprite(`G${g} / 4 SWITCHES`,'#a1beca');l.position.set((g%4-1.5)*22,.15,(Math.floor(g/4)-.5)*27+9);scene.add(l);labels.push(l)}
   for(const l of s.t.links){const geo=new LineGeometry();geo.setPositions(new Float32Array(25*3));const mat=new LineMaterial({color:'#477c90',transparent:true,opacity:.45,linewidth:1.1,depthWrite:false});mat.resolution.set(root.clientWidth,root.clientHeight);const line=new Line2(geo,mat);line.userData.id=l.id;cableGroup.add(line);wires.push(line);wirePoints.push([])}

   tray.castShadow=true;tray.receiveShadow=true;tray.instanceMatrix.needsUpdate=true;lights.instanceMatrix.needsUpdate=true;lights.instanceColor!.needsUpdate=true;updatePositions();lastMode='';
  }
  function updatePositions(){if(!sim)return;for(const n of sim.t.nodes){positions[n.id].set(...n.pos).lerp(new THREE.Vector3(...n.graph),morph);nodeMeshes[n.id].position.copy(positions[n.id])}
   let portIndex=0;for(const l of sim.t.links){
    const anchor=(id:number)=>{const n=sim!.t.nodes[id],adj=sim!.t.adj[id],index=adj.findIndex(e=>e.link===l.id);const p=positions[id].clone();if(n.kind!=='endpoint'){p.x+=(index-(adj.length-1)/2)*.26;p.z+=.84;p.y-=.06}dummy.position.copy(p);dummy.scale.setScalar(1);dummy.updateMatrix();ports!.setMatrixAt(portIndex++,dummy.matrix);return p};
    const a=anchor(l.a),b=anchor(l.b);let height=l.kind==='global'?(sim.t.kind==='dragonfly'?8:4):l.kind==='local'?3:.3;height*=1-morph*.85;const mid=a.clone().lerp(b,.5);mid.y+=height;const curve=new THREE.QuadraticBezierCurve3(a,mid,b),pts=curve.getPoints(24);wirePoints[l.id]=pts;const ar=new Float32Array(25*3);pts.forEach((p,i)=>{ar[i*3]=p.x;ar[i*3+1]=p.y;ar[i*3+2]=p.z});wires[l.id].geometry.setPositions(ar);wires[l.id].geometry.computeBoundingSphere()}if(ports){ports.count=portIndex;ports.instanceMatrix.needsUpdate=true}
  }
  function modeChange(st:SceneState){followAllowed=true;targetMorph=st.mode==='graph'?1:0;const selected=(st.selectedNode!==null?st.sim.t.nodes[st.selectedNode]:null)||st.sim.t.nodes[0];const p=new THREE.Vector3(...selected.pos);
   if(st.mode==='rack'){targetCam.copy(p).add(new THREE.Vector3(9,4,15));targetLook.copy(p).add(new THREE.Vector3(0,-3,0))}
   else if(st.mode==='packet'){targetCam.copy(p).add(new THREE.Vector3(17,12,27));targetLook.copy(p)}
   else if(st.mode==='fabric'){targetCam.set(58,68,78);targetLook.set(0,7,0)}
   else if(st.mode==='graph'){targetCam.set(0,83,101);targetLook.set(0,10,0)}
   else{targetCam.set(75,64,92);targetLook.set(0,4,0)}if(['system','fabric','graph'].includes(st.mode))targetCam.sub(targetLook).multiplyScalar(Math.max(1,1.3/camera.aspect)).add(targetLook);cameraTransition=1;lastMode=st.mode;
  }
  function visibleLink(l:Link,st:SceneState){if(st.rankFilter>=0&&!([l.a,l.b].includes(st.sim.t.endpoints[st.rankFilter])||st.sim.visual.some(p=>(p.src===st.rankFilter||p.dst===st.rankFilter)&&p.path.includes(l.a)&&p.path.includes(l.b))))return false;
   return st.filter==='all'||st.filter===l.kind||(st.filter==='congested'&&l.directions.some(p=>p.bytes>st.sim.c.bufferKiB*256))||(st.filter==='failed'&&(l.failed||l.factor<1))||(st.filter==='plane0'&&l.plane===0)||(st.filter==='plane1'&&l.plane===1)}
  function frame(t:number){raf=requestAnimationFrame(frame);const dt=Math.min((t-lastT)/1000,.05)||.016;lastT=t;const st=state.current;if(!st||document.hidden)return;if(sim!==st.sim)rebuild(st.sim);if(st.mode!==lastMode||st.viewRevision!==lastRevision){lastRevision=st.viewRevision;modeChange(st)}if(st.selectedNode!==oldSelected){oldSelected=st.selectedNode??-1;if(st.mode==='rack')modeChange(st)}
   if(Math.abs(morph-targetMorph)>.001){morph=reduced?targetMorph:THREE.MathUtils.damp(morph,targetMorph,3,dt);updatePositions()}
   if(followAllowed&&st.mode==='packet'&&st.microscope&&st.selectedPacket){const h=st.selectedPacket.hops.find(h=>st.microTime>=h.enqueue&&st.microTime<=(h.end||Infinity)+st.sim.c.hopUs);if(h){const l=st.sim.t.links[h.link],pts=wirePoints[h.link];let f=Math.max(0,Math.min(1,(st.microTime-h.start)/Math.max(.001,h.end-h.start+st.sim.c.hopUs)));if(h.from===l.b)f=1-f;const q=f*24,j=Math.min(23,Math.floor(q)),p=pts[j].clone().lerp(pts[j+1],q-j);targetLook.copy(p);targetCam.copy(p).add(new THREE.Vector3(17,12,27));cameraTransition=.5}}
   if(cameraTransition>0){camera.position.lerp(targetCam,reduced?1:1-Math.exp(-dt*3.5));controls.target.lerp(targetLook,reduced?1:1-Math.exp(-dt*3.5));cameraTransition-=dt*.28}
   const fade=st.xray||st.mode==='graph'||st.mode==='fabric'?.10:st.mode==='packet'?.25:.92;
   bodies.children.forEach(o=>(o as THREE.Mesh<THREE.BufferGeometry,THREE.Material>).material.opacity=fade);if(tray)(tray.material as THREE.MeshStandardMaterial).opacity=fade;if(lights)(lights.material as THREE.MeshBasicMaterial).opacity=fade;
   labels.forEach(l=>l.material.opacity=(1-morph)*.65);
   const critical=new Set(st.sim.lastStats.critical.map((x:number[])=>x[0]));
   for(const l of st.sim.t.links){const line=wires[l.id];line.visible=visibleLink(l,st);const m=line.material as LineMaterial;const q=Math.max(...l.directions.map(p=>p.bytes))/(st.sim.c.bufferKiB*1024);tmpColor.copy(l.failed?colors.failed:l.factor<1?colors.hot:q>.25?colors.high:l.util>.2?colors.mid:colors.low);m.color.copy(tmpColor);m.opacity=l.failed?.7:l.factor<1?.9:(st.mode==='graph'?.8:st.xray?.5:.22)+Math.max(l.util,q)*.65;
    m.linewidth=l.failed||l.factor<1?2.6:q>.1?2:1.1;if(st.mode==='graph'&&critical.has(l.id)&&!l.failed&&l.factor===1){m.color.set('#8bbaff');m.linewidth=2.7;m.opacity=.95}
    if(st.selectedPacket&&(st.mode==='packet'||st.focusRoute)){const inPath=st.selectedPacket.hops.some(h=>h.link===l.id);m.opacity=inPath?1:.06;if(inPath){m.color.copy(colors.white);m.linewidth=3}}
   }
   for(const n of st.sim.t.nodes){const obj=nodeMeshes[n.id],mat=obj.material as THREE.MeshStandardMaterial;const q=Math.max(0,...st.sim.t.adj[n.id].map(a=>st.sim.t.links[a.link].directions[a.dir].bytes));const failed=st.sim.t.adj[n.id].every(a=>st.sim.t.links[a.link].failed);mat.color.copy(failed?colors.hot:q>st.sim.c.bufferKiB*256?colors.high:colors.mid);mat.opacity=n.kind==='endpoint'?(st.mode==='rack'||st.mode==='packet'?1:.5):.95;obj.scale.setScalar(st.mode==='graph'&&n.kind!=='endpoint'?1+Math.min(1,(st.sim.lastStats.centrality[n.id]||0)/120):1)}
   let queued=0;for(const n of st.sim.t.nodes){if(n.kind==='endpoint')continue;const bytes=Math.max(0,...st.sim.t.adj[n.id].map(a=>st.sim.t.links[a.link].directions[a.dir].bytes));if(bytes<1024)continue;const height=bytes/(st.sim.c.bufferKiB*1024)*7;dummy.position.copy(positions[n.id]).add(new THREE.Vector3(2,height/2,0));dummy.scale.set(1,height,1);dummy.updateMatrix();queueMesh.setMatrixAt(queued++,dummy.matrix)}queueMesh.count=st.mode==='system'||st.mode==='packet'?0:queued;queueMesh.instanceMatrix.needsUpdate=true;
   let count=0,trails=0;packetMap=[];const list=st.microscope&&st.selectedPacket?[st.selectedPacket]:st.sim.visual;
   for(const p of list){if(count>=400)break;if(st.classFilter==='latency'&&p.cls!==1||st.classFilter==='bulk'&&p.cls!==0)continue;if(st.rankFilter>=0&&p.src!==st.rankFilter&&p.dst!==st.rankFilter)continue;const clock=st.microscope?st.microTime:st.sim.time;const h=p.hops.find(h=>clock>=h.enqueue&&clock<=(h.end||Infinity)+st.sim.c.hopUs);if(!h)continue;const pts=wirePoints[h.link];if(!pts?.length)continue;let f=h.end?Math.max(0,Math.min(1,(clock-h.start)/Math.max(.001,h.end-h.start+st.sim.c.hopUs))):0;const link=st.sim.t.links[h.link];if(h.from===link.b)f=1-f;const ii=f*24,i=Math.min(23,Math.floor(ii));dummy.position.copy(pts[i]).lerp(pts[i+1],ii-i);dummy.scale.setScalar(st.microscope?2:p.cls===1?1.2:.7);dummy.updateMatrix();packetMesh.setMatrixAt(count,dummy.matrix);packetMesh.setColorAt(count,p.cls===1?colors.white:colors.mid);packetMap[count]=p;count++;
    if(h.end&&clock>=h.start){const direction=h.from===link.b?-1:1;for(let step=1;step<=6;step++){const back=f-direction*step*.015;if(back<0||back>1)break;const u=back*24,j=Math.min(23,Math.floor(u));dummy.position.copy(pts[j]).lerp(pts[j+1],u-j);dummy.scale.setScalar((st.microscope?1.7:.75)*(1-step/8));dummy.updateMatrix();trailMesh.setMatrixAt(trails++,dummy.matrix)}}
   }trailMesh.count=trails;trailMesh.instanceMatrix.needsUpdate=true;
   packetMesh.count=count;packetMesh.instanceMatrix.needsUpdate=true;if(packetMesh.instanceColor)packetMesh.instanceColor.needsUpdate=true;
   if(st.selectedNode!==null&&positions[st.selectedNode]){ring.visible=true;ring.position.copy(positions[st.selectedNode]);ring.position.y+=.5;ring.rotation.z=reduced?0:t*.0002}else ring.visible=false;
   controls.update();renderer.render(scene,camera);frames++;fpsTime+=dt;if(fpsTime>1){root.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0}
  }
  function resize(){const w=root.clientWidth,h=root.clientHeight;renderer.setSize(w,h);wires.forEach(line=>line.material.resolution.set(w,h));camera.aspect=w/h;camera.updateProjectionMatrix();lastMode=''}
  const observer=new ResizeObserver(resize);observer.observe(root);resize();
  const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY;drag=true;cameraTransition=0;followAllowed=false};const up=(e:PointerEvent)=>{if(!drag||Math.hypot(e.clientX-downX,e.clientY-downY)>5)return;drag=false;const box=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);raycaster.setFromCamera(mouse,camera);const packetHits=raycaster.intersectObject(packetMesh);if(packetHits.length&&packetMap[packetHits[0].instanceId!]){actions.current.onPacket(packetMap[packetHits[0].instanceId!]);return}const hits=raycaster.intersectObjects(nodeMeshes);if(hits.length)actions.current.onSelect(hits[0].object.userData.id);else if(state.current?.mode==='packet'){const p=state.current.sim.packets.findLast(p=>p.done&&p.hops.length>3);if(p)actions.current.onPacket(p)}};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('wheel',()=>cameraTransition=0,{passive:true});raf=requestAnimationFrame(frame);actions.current.onReady(true);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(object=>{const obj=object as DisposableObject;obj.geometry?.dispose();if(obj.material){const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>{m.map?.dispose();m.dispose()})}});renderer.dispose();renderer.domElement.remove()};
 },[state]);
 return <div className="scene" ref={el} aria-label="Interactive three-dimensional compute fabric. Drag to orbit, scroll to zoom, click a switch to inspect it."/>;
}
