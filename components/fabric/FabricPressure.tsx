'use client';
import {Simulation} from '@/lib/fabric/simulator';
import {num} from './Panels';
/** Spatially ordered switch pressure: actual queue occupancy, or observed peaks after completion. */
export default function FabricPressure({sim,inspect}:{sim:Simulation;inspect:(id:number)=>void}){
 const complete=!!sim.collectiveEnd||sim.done;
 const pressure=Array.from({length:32},(_,id)=>{const edges=sim.t.adj[id];const values=edges.map(a=>({link:a.link,bytes:complete?sim.t.links[a.link].peakQueue:sim.t.links[a.link].directions[a.dir].bytes}));return values.sort((a,b)=>b.bytes-a.bytes)[0]||{link:0,bytes:0}});
 const max=Math.max(...pressure.map(p=>p.bytes),0),impaired=sim.t.links.filter(l=>l.failed||l.factor<1).length;
 return <section className="fabric-pressure" aria-label="Switch queue pressure map"><div className="pressure-title"><span>{complete?'RECORDED PEAK PRESSURE':'LIVE OUTPUT QUEUES'}</span><b>{num(max/1024,0)} KiB <small>largest</small></b></div>
 <div className="pressure-grid"><span/>{Array.from({length:8},(_,i)=><span className="pressure-group" key={i}>G{i}</span>)}{Array.from({length:4},(_,row)=><div className="pressure-row" key={row}><span className="pressure-row-label">S{row}</span>{Array.from({length:8},(_,group)=>{const p=pressure[group*4+row],v=Math.min(1,p.bytes/(sim.c.bufferKiB*1024)),failed=sim.t.adj[group*4+row].some(a=>sim.t.links[a.link].failed||sim.t.links[a.link].factor<1);return <button onClick={()=>inspect(group*4+row)} aria-label={`Inspect group ${group} switch ${row}, ${num(p.bytes/1024,1)} KiB queue`} className={`pressure-cell ${failed?'pressure-impaired':''}`} key={group} title={`G${group} S${row}: ${num(p.bytes/1024,1)} KiB ${complete?'peak on an attached link':'largest outgoing queue'}; link ${p.link}`} style={{background:v?`rgba(255, 184, 104, ${.16+v*.84})`:'#162d39'}}><i style={{height:v*100+'%'}}/></button>})}</div>)}</div>
 <div className="pressure-caption"><span>{complete?'Peak attached-link queue':'Largest outgoing queue'} / {sim.c.bufferKiB} KiB buffer</span><span>{impaired?`${impaired} impaired link${impaired===1?'':'s'}`:'All links available'}</span></div>
 </section>
}
