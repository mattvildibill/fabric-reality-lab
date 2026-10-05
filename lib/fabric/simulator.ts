import { Config, PROFILES } from './catalog';
import { Topology, topology, RANKS, graphStats } from './topology';
export type Hop={link:number;from:number;to:number;dir:number;enqueue:number;start:number;end:number;queue:number;aborted?:boolean};
export type Packet={id:number;flow:number;src:number;dst:number;bytes:number;cls:number;born:number;path:number[];index:number;hops:Hop[];candidates:{path:number[];score:number}[];reason:string;retries:number;done?:number};
export type Flow={id:number;src:number;dst:number;bytes:number;sent:number;received:number;inflight:number;cls:number;start:number;end:number;kind:string;round:number;latency:number;path:number[]|null;throttled:number;victim:boolean;delivered:number};
type EventData={send:number;arrive:Packet;depart:{p:Packet;id:number;dir:number};retry:Packet;trouble:string;repair:null};
type Event={ [K in keyof EventData]: {t:number;seq:number;type:K;data:EventData[K]} }[keyof EventData];
class Heap{a:Event[]=[];push(e:Event){let i=this.a.length;this.a.push(e);while(i){const p=(i-1)>>1;if(this.less(this.a[p],e))break;this.a[i]=this.a[p];i=p}this.a[i]=e}less(a:Event,b:Event){return a.t<b.t||(a.t===b.t&&a.seq<=b.seq)}pop(){const root=this.a[0],last=this.a.pop()!;if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.less(this.a[c+1],this.a[c]))c++;if(this.less(last,this.a[c]))break;this.a[i]=this.a[c];i=c}this.a[i]=last}return root}get first(){return this.a[0]}}
export type Sample={time:number;p50:number;p95:number;p99:number;util:number;queue:number;congested:number;delivered:number;affected:number;idle:number;completed:number;active:number};
export function percentile(values:number[],q:number){if(!values.length)return 0;const a=[...values].sort((a,b)=>a-b);return a[Math.max(0,Math.min(a.length-1,Math.ceil(q*a.length)-1))]}
export class Simulation{
 c:Config;t:Topology;time=0;heap=new Heap();seq=0;packetId=0;flows:Flow[]=[];packets:Packet[]=[];visual:Packet[]=[];samples:Sample[]=[];events:{time:number;text:string;kind:string}[]=[];routeCache=new Map<string,number[][]>();
 bytesDelivered=0;wireBytes=0;retries=0;reroutes=0;throttleCount=0;injected=false;repaired=false;affectedLinks:number[]=[];impairment:string|null=null;failureAt=0;recoveryAt:number|null=null;collectiveStart=0;collectiveEnd=0;collectiveRounds:{round:number;start:number;end:number}[]=[];roundRemaining=new Map<number,number>();rng:number;lastSample=0;done=false;maxQueue=0;fct:number[]=[];lastStats:ReturnType<typeof graphStats>;packetLatency:number[]=[];baseline:ReturnType<Simulation['summary']>|null=null;ideal=false;receiverActive=new Uint16Array(RANKS);rankReady=new Map<string,number>();rankFinished=0;
 constructor(c:Config,autoTrouble=false){this.c={...c};this.rng=c.seed>>>0;this.t=topology(c);this.lastStats=graphStats(this.t);this.ideal=c.profile==='quantum'&&c.collective&&(c.workload==='allreduce'||c.workload==='onepercent');this.launch();if(autoTrouble){this.schedule(c.injectAt,'trouble',c.trouble);this.schedule(c.repairAt,'repair',null)}}
 random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296}
 schedule<K extends keyof EventData>(t:number,type:K,data:EventData[K]){this.heap.push({t:Math.max(t,this.time),seq:this.seq++,type,data} as Event)}
 log(text:string,kind='info'){this.events.push({time:this.time,text,kind});if(this.events.length>80)this.events.shift()}
 rate(){return (this.c.normalized?this.c.rate:PROFILES[this.c.profile].rate)*125} // Gbit/s to bytes / microsecond
 addFlow(src:number,dst:number,bytes:number,cls=0,at=0,kind='bulk',round=-1){if(src===dst)dst=(dst+1)%RANKS;const f:Flow={id:this.flows.length,src,dst,bytes,sent:0,received:0,inflight:0,cls,start:at,end:0,kind,round,latency:0,path:null,throttled:0,victim:false,delivered:0};this.flows.push(f);this.schedule(at,'send',f.id);return f}
 launch(){const w=this.c.workload;this.log(`Seed ${this.c.seed} · ${w} · 128 explicitly simulated ranks`);if(w==='allreduce'||w==='onepercent'){if(this.c.synchronization==='local'&&!this.ideal){for(let rank=0;rank<RANKS;rank++)this.startRank(rank,0,0)}else this.startRound(0,0);return}
 const b=this.c.messageKiB*1024;const peer=(i:number)=>{if(this.random()*100<this.c.locality)return (i>>2)*4+((i%4+1+Math.floor(this.random()*3))%4);return Math.floor(this.random()*RANKS)};
 for(let i=0;i<RANKS;i++){
 const jitter=(100-this.c.load)*this.random()*.35;
 if(w==='alltoall')for(let k=1;k<RANKS;k++)this.addFlow(i,(i+k)%RANKS,Math.max(1024,b/8),0,Math.floor((k-1)/8)*25+jitter,'exchange');
 else if(w==='mpi')for(let k=0;k<12;k++)this.addFlow(i,peer(i),4096,1,k*30+jitter,'MPI');
 else if(w==='incast'){if(i)this.addFlow(i,0,b*4,0,jitter,'incast');}
 else if(w==='checkpoint')this.addFlow(i,i%4,b*16,0,jitter,'checkpoint');
 else if(w==='graph')for(let k=0;k<8;k++)this.addFlow(i,Math.floor(Math.pow(this.random(),3)*RANKS),Math.max(1024,b/16),1,k*30+jitter,'graph');
 else if(w==='elephant'){this.addFlow(i,peer(i),b*32,0,jitter,'elephant');for(let k=0;k<8;k++)this.addFlow(i,peer(i),4096,1,k*40+20+jitter,'mice')}
 else if(w==='mixed'){if(i<43){for(let k=0;k<5;k++)this.addFlow(i,(i+21+k)%43,b*4,0,k*35+jitter,'tenant A / training exchange')}else if(i<86){for(let k=0;k<10;k++)this.addFlow(i,43+Math.floor(this.random()*43),4096,1,k*30+jitter,'tenant B / MPI')}else this.addFlow(i,i%4,b*16,0,jitter,'tenant C / checkpoint')}
 else if(w==='exascale'){for(let k=0;k<4;k++){this.addFlow(i,(i+(k%2?127:1))%RANKS,b,0,k*50+jitter,'neighbor');this.addFlow(i,peer(i),b/4,1,k*50+30+jitter,'irregular')}this.addFlow(i,i^64,b,0,250+jitter,'sync')}
 else if(w==='physical'){this.addFlow(i,96+i%16,b*8,0,jitter,'camera');this.addFlow(i,96+i%16,b*2,0,70+jitter,'LiDAR');for(let k=0;k<5;k++){this.addFlow(i,96+i%16,2048,1,k*55+10,'control');this.addFlow(i,96+i%16,1024,1,k*55+12,'telemetry');}this.addFlow(i,96+i%16,4096,1,95+jitter,'inference request');if(i<8)this.addFlow(120+i,i,b*32,0,120,'model update')}
 }
 }
 startRound(round:number,at:number){const stages=this.ideal?14:7;if(round>=stages){this.collectiveEnd=this.time;this.log(`Collective completed at ${this.time.toFixed(2)} µs`,'success');return}
 this.collectiveRounds.push({round,start:at,end:0});
 if(this.ideal){const stage=round<7?round:13-round,step=1<<stage;this.roundRemaining.set(round,RANKS/(step*2));for(let i=0;i<RANKS;i+=step*2){const src=round<7?i+step:i,dst=round<7?i:i+step;this.addFlow(src,dst,this.c.messageKiB*1024,0,at,round<7?'ideal tree reduce':'ideal tree broadcast',round)}}
 else {this.roundRemaining.set(round,RANKS);for(let i=0;i<RANKS;i++)this.addFlow(i,i^(1<<round),this.c.messageKiB*1024,0,at,'allreduce',round)}
 }
 startRank(rank:number,round:number,at:number){
 if(round===7){this.rankFinished++;if(this.rankFinished===RANKS){this.collectiveEnd=this.time;this.log(`Collective completed at ${this.time.toFixed(2)} µs`,'success')}return}
 if(!this.collectiveRounds[round]){this.collectiveRounds[round]={round,start:at,end:0};this.roundRemaining.set(round,RANKS)}else this.collectiveRounds[round].start=Math.min(at,this.collectiveRounds[round].start);
 this.addFlow(rank,rank^(1<<round),this.c.messageKiB*1024,0,at,'allreduce',round);
 }
 rankComplete(rank:number,round:number,flag:number){const key=`${rank}:${round}`,old=this.rankReady.get(key)||0,next=old|flag;this.rankReady.set(key,next);if(next===3&&old!==3)this.startRank(rank,round+1,this.time+10)}
 bfs(src:number,dst:number,banned=-1):number[]{const prev=new Int32Array(this.t.nodes.length).fill(-1),q=[src];prev[src]=src;for(let i=0;i<q.length;i++){const n=q[i];if(n===dst)break;for(const e of this.t.adj[n])if(prev[e.node]<0&&!this.t.links[e.link].failed&&e.link!==banned&&(e.node===dst||this.t.nodes[e.node].kind!=='endpoint')){prev[e.node]=n;q.push(e.node)}}if(prev[dst]<0)return [];const path=[dst];while(path[0]!==src)path.unshift(prev[path[0]]);return path}
 getLink(a:number,b:number){return this.t.adj[a].find(x=>x.node===b)!}
 candidates(src:number,dst:number){const key=`${src}:${dst}`;if(this.routeCache.has(key))return this.routeCache.get(key)!;const first=this.bfs(src,dst),paths:number[][]=[];if(first.length){paths.push(first);for(let i=1;i<first.length-2;i++){const p=this.bfs(src,dst,this.getLink(first[i],first[i+1]).link);if(p.length&&!paths.some(x=>x.join(',')===p.join(',')))paths.push(p)}
 if(this.t.kind==='dragonfly'){for(let g=0;g<8;g++){if(g===this.t.nodes[src].group||g===this.t.nodes[dst].group)continue;const mid=g*4+(src+dst)%4;const a=this.bfs(src,mid),b=this.bfs(mid,dst),p=[...a,...b.slice(1)];if(a.length&&b.length&&new Set(p).size===p.length&&p.length<=first.length+4&&!paths.some(x=>x.join(',')===p.join(',')))paths.push(p)}}
 }this.routeCache.set(key,paths.slice(0,8));return paths.slice(0,8)}
 score(path:number[]){let score=0;for(let i=0;i<path.length-1;i++){const a=this.getLink(path[i],path[i+1]),l=this.t.links[a.link];if(l.failed)return 1e12;score+=(l.directions[a.dir].bytes+16384)/(this.rate()*l.factor*l.capacity)+this.c.hopUs}return score}
 select(p:Packet,node:number){const f=this.flows[p.flow],dest=this.t.endpoints[p.dst];let all=this.candidates(node,dest);if(!all.length)return false;
 if(this.c.profile!=='slingshot')all=all.filter(x=>x.length===Math.min(...all.map(p=>p.length)));
 const candidates=all.map(path=>({path,score:this.score(path)}));p.candidates=candidates;let route;
 if(this.c.ordered&&f.path&&node===this.t.endpoints[p.src]&&f.path.every((n,i)=>i===0||!this.t.links[this.getLink(f.path![i-1],n).link].failed)){route=f.path;p.reason='Ordered flow pinned to its established path';}
 else if(!this.c.adaptive){route=all[(p.src*31+p.dst)%all.length];p.reason='Static per-flow hash; failures remove unavailable paths';}
 else if(this.c.profile==='ultra'){route=all[(p.id+p.src)%all.length];p.reason='Deterministic packet spray over reachable minimal paths';}
 else {route=[...candidates].sort((a,b)=>a.score-b.score)[0].path;p.reason='Minimum estimated path cost: serialization + propagation + observed queues';}
 const minimal=all[0];if(route.join(',')!==minimal.join(','))this.reroutes++;
 p.path=route;p.index=0;if(this.c.ordered)f.path=route;return true;
 }
 send(id:number){const f=this.flows[id];if(f.sent>=f.bytes)return;
 const inflightTo=this.receiverActive[f.dst];
 const grant=this.c.profile==='ultra'&&this.c.receiver?Math.max(1,Math.floor(32/Math.max(1,inflightTo))):4;
 if(f.inflight>=grant)return;
 const src=this.t.endpoints[f.src];const candidates=this.candidates(src,this.t.endpoints[f.dst]);const q=candidates.length?Math.min(...candidates.map(p=>this.score(p))):10;
 const pressure=q>this.c.feedbackUs;let gate=0;
 if(pressure){gate=Math.min(20,q*.35);f.throttled++;this.throttleCount++;}
 const bytes=Math.min(16384,f.bytes-f.sent);const p:Packet={id:this.packetId++,flow:id,src:f.src,dst:f.dst,bytes,cls:f.cls,born:this.time,path:[],index:0,hops:[],candidates:[],reason:'',retries:0};f.sent+=bytes;if(f.inflight===0)this.receiverActive[f.dst]++;f.inflight++;
 if(!this.select(p,src)){p.path=[src];this.schedule(this.time+this.c.feedbackUs+10,'retry',p)}else this.schedule(this.time+gate,'arrive',p);
 this.packets.push(p);if(this.packets.length>2000)this.packets.shift();this.visual.push(p);if(this.visual.length>400)this.visual.shift();
 const gap=bytes/(this.rate()*Math.max(.05,this.c.load/100));if(f.sent<f.bytes&&f.inflight<grant)this.schedule(this.time+gap+gate,'send',id);
 }
 arrive(p:Packet){if(p.index>=p.path.length-1){this.complete(p);return}const from=p.path[p.index],to=p.path[p.index+1],a=this.getLink(from,to),l=this.t.links[a.link];
 if(l.failed){if(!this.select(p,from)){this.schedule(this.time+this.c.feedbackUs+10,'retry',p);return}this.schedule(this.time+this.c.hopUs,'arrive',p);return}
 const port=l.directions[a.dir];if(port.bytes+p.bytes>this.c.bufferKiB*1024){this.schedule(this.time+this.c.feedbackUs,'arrive',p);this.flows[p.flow].victim=true;return}
 p.hops.push({link:l.id,from,to,dir:a.dir,enqueue:this.time,start:0,end:0,queue:port.bytes});port.queue[this.c.qos?p.cls:0].push(p);port.bytes+=p.bytes;this.maxQueue=Math.max(this.maxQueue,port.bytes);l.peakQueue=Math.max(l.peakQueue,port.bytes);
 if(!port.busy)this.serve(l.id,a.dir);
 }
 serve(id:number,dir:number){const l=this.t.links[id],port=l.directions[dir];const p=port.queue[1].shift()||port.queue[0].shift();if(!p){port.busy=false;return}port.busy=true;const hop=p.hops[p.hops.length-1];hop.start=this.time;const factor=l.failed?1:l.factor;hop.end=this.time+p.bytes/(this.rate()*factor*l.capacity);this.schedule(hop.end,'depart',{p,id,dir});}
 depart({p,id,dir}:{p:Packet;id:number;dir:number}){const l=this.t.links[id],port=l.directions[dir];port.bytes-=p.bytes;port.served+=p.bytes;l.bytes+=p.bytes;l.windowBytes+=p.bytes;this.wireBytes+=p.bytes;port.busy=false;this.serve(id,dir);
 if(l.failed){p.hops.at(-1)!.aborted=true;p.retries++;this.retries++;this.schedule(this.time+this.c.feedbackUs+10,'retry',p);return}p.index++;this.schedule(this.time+this.c.hopUs,'arrive',p);
 }
 complete(p:Packet){p.done=this.time;this.packetLatency.push(this.time-p.born);if(this.packetLatency.length>10000)this.packetLatency.shift();this.bytesDelivered+=p.bytes;const f=this.flows[p.flow];f.received+=p.bytes;f.inflight--;if(f.inflight===0)this.receiverActive[f.dst]--;f.delivered++;
 if(p.hops.some(h=>h.start-h.enqueue>this.c.feedbackUs))f.victim=true;
 if(f.received>=f.bytes&&!f.end){f.end=this.time;f.latency=f.end-f.start;this.fct.push(f.latency);if(f.round>=0){const n=(this.roundRemaining.get(f.round)||1)-1;this.roundRemaining.set(f.round,n);if(n===0)this.collectiveRounds[f.round].end=this.time;if(this.c.synchronization==='local'&&!this.ideal){this.rankComplete(f.src,f.round,1);this.rankComplete(f.dst,f.round,2)}else if(n===0)this.startRound(f.round+1,this.time+10)}}
 if(f.sent<f.bytes)this.schedule(this.time+this.c.hopUs,'send',f.id);
 }
 trouble(kind:string){if(this.injected&&!this.repaired)return;this.injected=true;this.repaired=false;this.impairment=kind;this.failureAt=this.time;this.recoveryAt=null;this.affectedLinks=[];const fabric=this.t.links.filter(l=>l.kind!=='endpoint').sort((a,b)=>b.bytes-a.bytes||a.id-b.id),busy=fabric[0];
 if(kind==='cut')this.affectedLinks=[busy.id];
 if(kind==='optical')this.affectedLinks=fabric.slice(0,Math.max(1,Math.ceil(fabric.length*.01))).map(x=>x.id);
 if(kind==='switch'){const sw=busy.a;this.affectedLinks=this.t.adj[sw].map(e=>e.link)}
 if(kind==='plane')this.affectedLinks=fabric.filter(l=>l.plane===0).map(l=>l.id);
 if(kind==='slow')this.affectedLinks=[this.t.links.find(l=>l.kind==='endpoint'&&l.b===this.t.endpoints[0])!.id];
 for(const id of this.affectedLinks){const l=this.t.links[id];if(kind==='optical'||kind==='slow')l.factor=(this.c.degradedCapacity??10)/100;else l.failed=true}
 for(const id of this.affectedLinks){const l=this.t.links[id];if(!l.failed)continue;for(const port of l.directions){for(const q of port.queue){for(const p of q){port.bytes-=p.bytes;const hop=p.hops.at(-1)!;hop.start=this.time;hop.end=this.time;hop.aborted=true;p.retries++;this.retries++;this.schedule(this.time+this.c.feedbackUs+10,'retry',p)}q.length=0}}}
 if(kind==='incast'||kind==='burst')for(let i=1;i<RANKS;i++)this.addFlow(i,0,this.c.messageKiB*1024*(kind==='burst'?1:8),0,this.time,'injected incast');
 if(kind==='noise')for(let i=0;i<32;i++)this.addFlow(i,64+i,this.c.messageKiB*1024*16,0,this.time,'noisy neighbor');
 this.routeCache.clear();this.lastStats=graphStats(this.t);this.log(`${kind}: ${this.affectedLinks.length?this.affectedLinks.length+' links affected':'traffic injected'}`,'fault');
 }
 // Replace scheduled interventions when the user injects a live fault.
 intervene(kind:string,repairDelay=400){if(this.injected&&!this.repaired)return;const events=this.heap.a.filter(e=>e.type!=='trouble'&&e.type!=='repair');this.heap=new Heap();for(const event of events)this.heap.push(event);this.c.trouble=kind;this.trouble(kind);this.c.repairAt=this.time+repairDelay;this.schedule(this.c.repairAt,'repair',null)}
 repair(){if(!this.injected||this.repaired)return;for(const l of this.t.links){l.failed=false;l.factor=1}this.routeCache.clear();this.repaired=true;this.c.repairAt=this.time;this.lastStats=graphStats(this.t);this.log('Link capacity restored; queued work drains','success')}
 sample(){const pct=(q:number)=>percentile(this.packetLatency,q);const dt=this.time-this.lastSample||1;let util=0,cap=0,queue=0,congested=0;
 for(const l of this.t.links){const capacity=l.failed?0:this.rate()*l.factor*l.capacity*2; l.util=capacity?Math.min(1,l.windowBytes/(dt*capacity)):0;util+=l.windowBytes;cap+=capacity*dt;queue+=l.directions[0].bytes+l.directions[1].bytes;if(Math.max(...l.directions.map(p=>p.bytes))>this.c.bufferKiB*1024*.25)congested++;l.windowBytes=0}
 const completed=this.flows.filter(f=>f.end>0).length;const idle=this.collectiveEnd?this.idleProxy():0;
 const s:Sample={time:this.time,p50:pct(.5),p95:pct(.95),p99:pct(.99),util:cap?Math.min(1,util/cap):0,queue,congested,delivered:this.bytesDelivered,affected:this.flows.filter(f=>f.victim).length,idle,completed,active:this.flows.filter(f=>!f.end&&f.start<=this.time).length};this.samples.push(s);if(this.samples.length>300)this.samples.shift();this.lastSample=this.time;
 if(this.repaired&&this.recoveryAt===null&&queue===0){this.recoveryAt=this.time;this.log(`Queues drained ${(this.time-this.c.repairAt).toFixed(1)} µs after scheduled repair`,'success')}
 return s;
 }
 idleProxy(){let idle=0,total=0;if(this.c.synchronization==='local'&&!this.ideal){for(const r of this.collectiveRounds){const fs=this.flows.filter(f=>f.round===r.round);for(const out of fs){const incoming=fs.find(f=>f.dst===out.src);if(out.end&&incoming?.end){idle+=Math.abs(out.end-incoming.end);total+=Math.max(out.end,incoming.end)-out.start}}}}else{for(const r of this.collectiveRounds)if(r.end){const fs=this.flows.filter(f=>f.round===r.round);idle+=fs.reduce((s,f)=>s+Math.max(0,r.end-f.end),0);total+=(r.end-r.start)*RANKS}}return total?idle/(total+this.c.computeUs*RANKS):0}
 advance(target:number,maxEvents=50000,maxWallMs=Infinity){const deadline=performance.now()+maxWallMs;target=Math.max(this.time,Number.isFinite(target)?target:this.time);let count=0;while(this.heap.first&&this.heap.first.t<=target&&count++<maxEvents){if(count%32===0&&performance.now()>=deadline)break;const e=this.heap.pop();this.time=e.t;switch(e.type){case'send':this.send(e.data);break;case'arrive':this.arrive(e.data);break;case'depart':this.depart(e.data);break;case'retry':{const p=e.data;if(this.select(p,this.t.endpoints[p.src]))this.schedule(this.time,'arrive',p);else this.schedule(this.time+this.c.feedbackUs+10,'retry',p);break}case'trouble':this.trouble(e.data);break;case'repair':this.repair();break}}
 if(!this.heap.first||this.heap.first.t>target)this.time=target;this.done=!this.heap.first;return count;
 }
 finish(limit=4000){while(this.time<limit&&!this.done){this.advance(Math.min(limit,this.time+10),200000);this.sample()}return this.summary()}
 summary(){const a=[...this.packetLatency].sort((a,b)=>a-b);const completed=this.flows.filter(f=>f.end>0);return {profile:this.c.profile,seed:this.c.seed,horizon:this.time,collectiveIncomplete:(this.c.workload==='allreduce'||this.c.workload==='onepercent')&&!this.collectiveEnd,rounds:this.collectiveRounds.map(r=>({...r})),packetP50:percentile(a,.5),packetP99:percentile(a,.99),flowP99:percentile(this.fct,.99),collective:this.collectiveEnd||null,makespan:Math.max(0,...completed.map(f=>f.end)),bytes:this.bytesDelivered,wireBytes:this.wireBytes,peakQueue:this.maxQueue,affected:completed.filter(f=>f.victim).length,idle:this.idleProxy(),reroutes:this.reroutes,retries:this.retries,completed:completed.length,total:this.flows.length,censored:this.flows.length-completed.length,recovery:this.recoveryAt===null?null:this.recoveryAt-this.c.repairAt,config:this.c};}
}
export function compare(c:Config){return (['slingshot','quantum','spectrum','ultra'] as const).map(profile=>{const config={...c,profile};const base=new Simulation(config).finish();const impaired=new Simulation(config,true).finish();return {profile,base,impaired}})}

/** Bounded chunks yield to controls/rendering; event order is identical to synchronous finish. */
export async function finishAsync(sim:Simulation,limit=4000,cancelled=()=>false){while(sim.time<limit&&!sim.done){if(cancelled())return null;const target=Math.min(limit,sim.time+10);do{sim.advance(target,2000,8);if(cancelled())return null;await new Promise<void>(r=>setTimeout(r,0))}while(sim.heap.first&&sim.heap.first.t<=target);sim.sample()}return sim.summary()}
