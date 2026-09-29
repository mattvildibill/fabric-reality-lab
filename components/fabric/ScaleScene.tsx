'use client';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
export type FilmClock={time:number;paused:boolean;reduced:boolean};
type Part={p:[number,number,number];s:[number,number,number];color:string;layer:'room'|'rack'|'board'|'die'|'lid';};
type Segment={a:[number,number,number];b:[number,number,number];color:string};
const mix=THREE.MathUtils.lerp,clamp=(x:number)=>Math.max(0,Math.min(1,x)),ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
const keys=[
 {t:0,p:[110,74,128],q:[0,3,0]},
 {t:7,p:[44,39,61],q:[0,9,0]},
 {t:14,p:[26,32,36],q:[0,17,0]},
 {t:22,p:[16,31,21],q:[0,18,0]},
 {t:31,p:[5.3,24.2,7.6],q:[0,19,0]},
 {t:40,p:[3.8,23,5.1],q:[0,19,0]},
 {t:48,p:[3.2,23.3,5.6],q:[0,19,0]},
 {t:56,p:[13,30,18],q:[0,18,0]},
 {t:64,p:[57,49,77],q:[0,4,0]},
 {t:72,p:[91,65,112],q:[0,3,0]}
];
export function sceneParts(){const parts:Part[]=[],lines:Segment[]=[];
 const box=(p:Part['p'],s:Part['s'],color:string,layer:Part['layer'])=>parts.push({p,s,color,layer});
 // A representative board in a selected cabinet. Geometry illustrates physical hierarchy, not vendor hardware.
 for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){if(col===0&&row===0)continue;const x=col*35,z=row*35;box([x,0,z],[25,49,22],'#27343e','room');box([x,0,z+11.1],[22,46,.3],'#0c1219','room');for(let j=0;j<12;j++){box([x,-21+j*3.8,z+11.4],[21,2.8,.35],'#41515c','room');box([x+8,-21+j*3.8,z+11.7],[.3,.25,.2],j%3?'#42daca':'#ffbd71','room')}box([x,25,z],[26,.5,23],'#667c88','room')}
 box([0,-25,0],[210,1,210],'#101921','room');
 for(const x of [-12,12])for(const z of [-10,10])box([x,0,z],[.6,50,.6],'#9aaeb5','rack');
 for(const y of [-24,25])box([0,y,0],[25,.7,22],'#687f89','rack');
 for(let i=0;i<10;i++){const y=-21+i*3.6;box([0,y,0],[23,.5,20],'#4d626c','rack');box([0,y+.6,10],[22,1.4,.7],'#273d46','rack');for(let k=0;k<10;k++)box([-9+k*1.9,y+.6,10.4],[1.3,.6,.3],k%3===0?'#76efd2':'#101b23','rack')}
 // PCB, plated edges, retention fixtures and visibly different component families.
 box([0,18,0],[22,.28,16],'#123e3d','board');box([0,17.77,0],[22,.16,16],'#0c252a','board');
 for(const x of [-10.4,10.4])for(const z of [-7.3,7.3]){box([x,18.25,z],[.55,.3,.55],'#c4c9bd','board');box([x,18.43,z],[.18,.08,.18],'#27383e','board')}
 for(let i=0;i<12;i++){const x=-9.3+i*1.68;box([x,18.7,7.65],[1.35,1.1,1.75],'#9faeb1','board');box([x,18.74,8.55],[1.03,.65,.09],'#08161e','board');box([x+.47,19.07,8.61],[.12,.1,.05],'#63f0b4','board')}
 for(const z of [-5,5])for(let i=0;i<4;i++){const x=-5.8+i*3.8;box([x,18.42,z],[2.5,.52,1.15],'#15212a','board');for(let pin=0;pin<12;pin++){box([x-1.1+pin*.2,18.26,z-.71],[.065,.14,.27],'#bcb7a2','board');box([x-1.1+pin*.2,18.26,z+.71],[.065,.14,.27],'#bcb7a2','board')}}
 for(const x of [-8,8])for(let i=0;i<5;i++){const z=-3.6+i*1.7;box([x,18.7,z],[1.2,1.1,1.05],'#64747d','board');box([x-1,18.3,z],[.4,.3,.65],'#cbbd94','board')}
 for(let i=0;i<96;i++){const x=-10+(i*37%193)/10,z=-6.7+(i*17%137)/10;if(Math.abs(x)<4.1&&Math.abs(z)<3.9)continue;box([x,18.27,z],[.35,.16,.15],i%3?'#858985':'#ad9165','board')}
 box([0,18.3,0],[7,.35,6.5],'#132e29','board');box([0,18.62,0],[5.8,.4,5.5],'#303c46','board');box([0,18.91,0],[4.8,.17,4.5],'#99acb8','die');box([0,19.03,0],[4.5,.07,4.2],'#345c73','die');
 // Stop at a sealed, illustrative switch package: the model has no die floorplan.
 box([0,19.12,0],[4.5,.12,4.2],'#687e8c','die');
 box([0,19.35,0],[7.1,.4,6.7],'#94a5ac','lid');for(let n=0;n<42;n++)box([-3.34+n*.163,20.5,0],[.075,2,6.4],'#a5b4b9','lid');
 // Board traces are one batch, rather than hundreds of independently rendered cables.
 for(let side=0;side<4;side++)for(let k=0;k<28;k++){const u=(k-13.5)*.14;let a:Segment['a'],b:Segment['a'],c:Segment['a'];if(side<2){const sign=side?1:-1;a=[sign*3.5,18.18,u];b=[sign*(5+Math.abs(u)*.6),18.18,u];c=[sign*8,18.18,u*2.3]}else{const sign=side===2?1:-1;a=[u,18.18,sign*3.3];b=[u,18.18,sign*(4+Math.abs(u)*.3)];c=[u*3.5,18.18,sign*6.9]}lines.push({a,b,color:k%5?'#628f80':'#b5a16b'},{a:b,b:c,color:k%5?'#628f80':'#b5a16b'})}
 return {parts,lines};}
export default function ScaleScene({clock,onReady}:{clock:React.RefObject<FilmClock>;onReady:(renderer:string)=>void}){const root=useRef<HTMLDivElement>(null),ready=useRef(onReady);ready.current=onReady;
 useEffect(()=>{if(!root.current)return;const el=root.current,{parts,lines}=sceneParts();const camera=new THREE.PerspectiveCamera(40,1,.1,700);const v=new THREE.Vector3(),look=new THREE.Vector3();let raf=0,w=1,h=1,oldTime=-1,frames=0,start=performance.now();
 function position(t:number){let index=keys.findIndex(k=>k.t>t);if(index<0)index=keys.length-1;if(index===0)index=1;const a=keys[index-1],b=keys[index],u=ease((t-a.t)/(b.t-a.t));v.set(mix(a.p[0],b.p[0],u),mix(a.p[1],b.p[1],u),mix(a.p[2],b.p[2],u));look.set(mix(a.q[0],b.q[0],u),mix(a.q[1],b.q[1],u),mix(a.q[2],b.q[2],u));if(w<h)v.sub(look).multiplyScalar(1.35).add(look);camera.position.copy(v);camera.lookAt(look);camera.near=Math.max(.04,v.distanceTo(look)/100);camera.far=v.distanceTo(look)+400;camera.updateProjectionMatrix();camera.updateMatrixWorld()}
 let renderer:THREE.WebGLRenderer|null=null;try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{}
 // Opaque geometry keeps correct depth ordering. Reveal the board by moving
 // surrounding structures away, avoiding blended instanced surfaces.
 const offset=(layer:Part['layer'],t:number)=>layer==='room'?-95*ease((t-8)/9)*(1-ease((t-58)/9)):layer==='rack'?-65*ease((t-16)/8)*(1-ease((t-56)/8)):layer==='lid'?35*ease((t-18)/11):0;
 const visible=(layer:Part['layer'],t:number)=>layer==='room'?t<17||t>58:layer==='rack'?t<24||t>56:layer==='lid'?t<29:true;
 let render:(t:number)=>void,dispose:()=>void,resize:()=>void;
 if(renderer){const gl=renderer;gl.setPixelRatio(Math.min(devicePixelRatio,1.5));gl.setClearColor('#080f16');gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.25;el.appendChild(gl.domElement);const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#080f16',.0023);const pmrem=new THREE.PMREMGenerator(gl),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();scene.add(new THREE.HemisphereLight('#daeaff','#102332',2.2));const light=new THREE.DirectionalLight('#ffe7c9',3);light.position.set(-25,65,30);scene.add(light);const rim=new THREE.DirectionalLight('#73d8ff',2);rim.position.set(30,20,-40);scene.add(rim);
 const meshes:Record<string,THREE.InstancedMesh>={},dummy=new THREE.Object3D();for(const layer of ['room','rack','board','die','lid'] as const){const ps=parts.filter(p=>p.layer===layer),m=new THREE.MeshStandardMaterial({roughness:layer==='die'?.62:.6,metalness:layer==='board'?.25:.45});const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),m,ps.length);for(let i=0;i<ps.length;i++){const p=ps[i];dummy.position.set(...p.p);dummy.scale.set(...p.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(p.color))}mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);meshes[layer]=mesh}
 const geo=new THREE.BufferGeometry(),pos:number[]=[],colors:number[]=[];for(const l of lines){pos.push(...l.a,...l.b);const c=new THREE.Color(l.color);colors.push(c.r,c.g,c.b,c.r,c.g,c.b)}geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));scene.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({vertexColors:true})));
 render=t=>{position(t);for(const [layer,m] of Object.entries(meshes)){m.visible=visible(layer as Part['layer'],t);m.position.y=offset(layer as Part['layer'],t)}gl.render(scene,camera);el.dataset.drawCalls=String(gl.info.render.calls)};
 resize=()=>{gl.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();oldTime=-1};dispose=()=>{scene.traverse((o:any)=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()});env.dispose();gl.dispose();gl.domElement.remove()};el.dataset.renderer='webgl';ready.current('WebGL');
 }else{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;el.appendChild(canvas);const color=new THREE.Color();const faces=[{n:[0,1,0],idx:[2,3,7,6],light:1.25},{n:[0,0,1],idx:[4,5,7,6],light:.82},{n:[0,0,-1],idx:[0,1,3,2],light:.65},{n:[1,0,0],idx:[1,3,7,5],light:.96},{n:[-1,0,0],idx:[0,2,6,4],light:.7}];
 const corners=[[-1,-1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]];
 const geometry=parts.map(p=>({part:p,points:corners.map(c=>new THREE.Vector3(p.p[0]+c[0]*p.s[0]/2,p.p[1]+c[1]*p.s[1]/2,p.p[2]+c[2]*p.s[2]/2))}));
 // Clip polygons at the camera planes rather than dropping a whole board
 // when one corner leaves the frustum during a close-up.
 const clipped=(pts:THREE.Vector3[])=>{let poly=pts.map(p=>p.clone().applyMatrix4(camera.matrixWorldInverse));for(const [z,sign] of [[-camera.near,-1],[-camera.far,1]]){const out:THREE.Vector3[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ain=(a.z-z)*sign>=0,bin=(b.z-z)*sign>=0;if(ain)out.push(a);if(ain!==bin)out.push(a.clone().lerp(b,(z-a.z)/(b.z-a.z)))}poly=out}return poly.map(p=>{p.applyMatrix4(camera.projectionMatrix);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2,z:p.z}})};
 const project=(v:THREE.Vector3)=>{const z=v.clone().project(camera);return {x:(z.x+1)*w/2,y:(1-z.y)*h/2,z:z.z}};
 render=t=>{position(t);ctx.globalAlpha=1;ctx.fillStyle='#09121b';ctx.fillRect(0,0,w,h);const bg=ctx.createRadialGradient(w*.6,h*.35,1,w*.5,h*.5,w*.75);bg.addColorStop(0,'#2c4657');bg.addColorStop(1,'#071019');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const drawable: {ps:ReturnType<typeof project>[];depth:number;color:string;alpha:number;priority:number}[]=[];
 for(const item of geometry){const {part:p}=item,alpha=1;if(!visible(p.layer,t))continue;const ly=offset(p.layer,t);const center=new THREE.Vector3(p.p[0],p.p[1]+ly,p.p[2]);const distance=center.distanceTo(camera.position);if((p.layer==='room'||p.layer==='rack')&&t>26&&t<55)continue;const points=item.points.map(pt=>project(ly?pt.clone().add(new THREE.Vector3(0,ly,0)):pt));if(points.every(p=>p.x<0)||points.every(p=>p.x>w)||points.every(p=>p.y<0)||points.every(p=>p.y>h))continue;const size=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));if(size<1.1)continue;for(const face of faces){if(new THREE.Vector3(...face.n as [number,number,number]).dot(camera.position.clone().sub(center))<=0)continue;color.set(p.color).multiplyScalar(face.light);const ps=clipped(face.idx.map(i=>item.points[i].clone().add(new THREE.Vector3(0,ly,0))));if(ps.length<3)continue;drawable.push({ps,depth:distance,color:'#'+color.getHexString(),alpha,priority:t<16?0:p.layer==='lid'?6:p.layer==='die'?(p.p[1]>19.06?4:3):p.layer==='board'?(p.p[1]>18.2?2:1):0})}}
 drawable.sort((a,b)=>a.priority-b.priority||b.depth-a.depth);for(const d of drawable){ctx.globalAlpha=d.alpha;ctx.beginPath();d.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=d.color;ctx.fill();}
 ctx.globalAlpha=1;el.dataset.drawCalls=String(drawable.length)};
 resize=()=>{const d=Math.min(devicePixelRatio,1.25);canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);camera.aspect=w/h;camera.updateProjectionMatrix();oldTime=-1};dispose=()=>canvas.remove();el.dataset.renderer='software';ready.current('Software 3D');}
 const observer=new ResizeObserver(()=>{w=el.clientWidth;h=el.clientHeight;resize()});observer.observe(el);w=el.clientWidth;h=el.clientHeight;resize();
 function frame(now:number){raf=requestAnimationFrame(frame);if(document.hidden)return;const t=clock.current.time;if(t===oldTime)return;const before=performance.now();render(t);oldTime=t;el.dataset.renderMs=(performance.now()-before).toFixed(1);frames++;if(now-start>=1500){el.dataset.fps=(frames*1000/(now-start)).toFixed(0);frames=0;start=now}}
 raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);observer.disconnect();dispose()};
 },[clock]);
 return <div className="scale-scene" ref={root} aria-label="Illustrative hardware journey from a computer room to a switch package; not a reconstruction of the modeled hardware"/>;
}
