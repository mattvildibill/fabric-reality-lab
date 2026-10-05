import { Config, PROFILES } from './catalog';
import type { Packet } from './simulator';
export type Node={id:number;label:string;kind:'switch'|'endpoint'|'spine';group:number;plane:number;pos:[number,number,number];graph:[number,number,number]};
export type Link={id:number;a:number;b:number;kind:'endpoint'|'local'|'global';plane:number;capacity:number;failed:boolean;factor:number;bytes:number;windowBytes:number;util:number;peakQueue:number;directions:[Port,Port]};
export type Port={queue:Packet[][];bytes:number;busy:boolean;served:number};
export type Topology={nodes:Node[];links:Link[];adj:{node:number;link:number;dir:number}[][];endpoints:number[];kind:string};
export const RANKS=128, LEAVES=32;
export function topology(c:Config):Topology{
 const kind=c.commonTopology?'clos':PROFILES[c.profile].topology;
 const nodes:Node[]=[],links:Link[]=[],adj:Topology['adj']=[];
 const addNode=(n:Omit<Node,'id'>)=>{const id=nodes.length;nodes.push({id,...n});adj.push([]);return id};
 const addLink=(a:number,b:number,k:Link['kind'],plane=0,capacity=1)=>{const id=links.length;links.push({id,a,b,kind:k,plane,capacity,failed:false,factor:1,bytes:0,windowBytes:0,util:0,peakQueue:0,directions:[{queue:[[],[]],bytes:0,busy:false,served:0},{queue:[[],[]],bytes:0,busy:false,served:0}]});adj[a].push({node:b,link:id,dir:0});adj[b].push({node:a,link:id,dir:1})};
 for(let i=0;i<LEAVES;i++){const g=i>>2,l=i%4;const x=(g%4-1.5)*22+(l%2-.5)*5.5,z=(Math.floor(g/4)-.5)*27+(Math.floor(l/2)-.5)*7;const a=g*Math.PI/4;addNode({label:`G${g} · S${l}`,kind:'switch',group:g,plane:0,pos:[x,8,z],graph:[Math.cos(a)*30+(l%2-.5)*6,7+(l>>1)*6,Math.sin(a)*30]})}
 if(kind==='dragonfly'){
  for(let g=0;g<8;g++)for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)addLink(g*4+a,g*4+b,'local');
  for(let a=0;a<8;a++)for(let b=a+1;b<8;b++)addLink(a*4+b%4,b*4+a%4,'global',(a+b)%2);
 }else{
  for(let p=0;p<(kind==='planes'?2:1);p++)for(let j=0;j<4;j++){
   const s=addNode({label:`P${p} · spine ${j}`,kind:'spine',group:8+p,plane:p,pos:[(j-1.5)*16,22+p*6,0],graph:[(j-1.5)*18,30,p*15-7.5]});
   for(let i=0;i<LEAVES;i++)addLink(i,s,'global',p,kind==='planes'?.5:1);
  }
 }
 const endpoints:number[]=[];
 for(let r=0;r<RANKS;r++){const l=r>>2,n=nodes[l],k=r%4;const id=addNode({label:`rank ${r}`,kind:'endpoint',group:n.group,plane:0,pos:[n.pos[0]+(k%2-.5)*1.7,1.5+(k>>1)*2,n.pos[2]+1.5],graph:[n.graph[0]+(k%2-.5)*2.5,n.graph[1]-5,n.graph[2]+(k>>1)*2]});endpoints.push(id);addLink(l,id,'endpoint')}
 return {nodes,links,adj,endpoints,kind};
}
export function graphStats(t:Topology){
 const ids=t.nodes.filter(n=>n.kind!=='endpoint').map(n=>n.id),set=new Set(ids),bc=new Map<number,number>(),edge=new Map<number,number>();
 let components=0,distSum=0,pairs=0,diameter=0;const seen=new Set<number>();
 for(const s of ids){if(!seen.has(s)){components++;const q=[s];seen.add(s);for(let i=0;i<q.length;i++)for(const e of t.adj[q[i]])if(set.has(e.node)&&!t.links[e.link].failed&&!seen.has(e.node)){seen.add(e.node);q.push(e.node)}}
 const stack:number[]=[],pred:Record<number,{v:number;l:number}[]>={},sigma:Record<number,number>={},d:Record<number,number>={},delta:Record<number,number>={};for(const v of ids){pred[v]=[];sigma[v]=0;d[v]=-1;delta[v]=0}sigma[s]=1;d[s]=0;const q=[s];
 for(let i=0;i<q.length;i++){const v=q[i];stack.push(v);for(const e of t.adj[v]){if(!set.has(e.node)||t.links[e.link].failed)continue;const w=e.node;if(d[w]<0){q.push(w);d[w]=d[v]+1}if(d[w]===d[v]+1){sigma[w]+=sigma[v];pred[w].push({v,l:e.link})}}}
 for(const v of ids)if(v!==s&&d[v]>=0){distSum+=d[v];pairs++;diameter=Math.max(diameter,d[v])}
 while(stack.length){const w=stack.pop()!;for(const {v,l}of pred[w]){const x=sigma[v]/sigma[w]*(1+delta[w]);delta[v]+=x;edge.set(l,(edge.get(l)||0)+x/2)}if(w!==s)bc.set(w,(bc.get(w)||0)+delta[w]/2)}
 }
 const degrees=ids.map(i=>t.adj[i].filter(e=>set.has(e.node)&&!t.links[e.link].failed).length);
 return {components,meanPath:pairs?distSum/pairs:0,diameter,degreeMin:Math.min(...degrees),degreeMax:Math.max(...degrees),centrality:Object.fromEntries(bc),critical:[...edge].sort((a,b)=>b[1]-a[1]).slice(0,5),switches:ids.length};
}
