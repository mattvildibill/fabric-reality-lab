'use client';
import {Packet} from '@/lib/fabric/simulator';
import {num} from './Panels';
/** All bar extents use the packet's recorded timestamps, on one shared time axis. */
export default function PacketTiming({packet,time}:{packet:Packet;time:number}){
 const end=packet.done||packet.hops.at(-1)?.end||packet.born+1,total=Math.max(.001,end-packet.born),x=(v:number)=>43+Math.max(0,Math.min(1,(v-packet.born)/total))*211;
 const row=packet.hops.findIndex(h=>time>=h.enqueue&&time<=h.end),queue=packet.hops.reduce((v,h)=>v+Math.max(0,h.start-h.enqueue),0);
 return <section className="packet-timing" aria-label="Recorded packet timing diagram"><div className="timing-title">HOP-BY-HOP TIMING <span>µs</span></div><svg viewBox={`0 0 270 ${packet.hops.length*31+35}`} role="img" aria-label={`${packet.hops.length} hops, ${num(queue,2)} microseconds queued out of ${num(total,2)} total`}>
 {[0,.5,1].map(f=><g key={f}><line x1={43+211*f} x2={43+211*f} y1={19} y2={packet.hops.length*31+20} stroke="#344b56" strokeDasharray="2 4"/><text x={43+211*f} y={11} textAnchor="middle" fill="#9bb4be" fontSize="10">{num(total*f,2)}</text></g>)}
 {packet.hops.map((h,n)=><g key={n}><text x={0} y={n*31+38} fill={row===n?'#d5f7b9':'#97aeb9'} fontSize="11">L{h.link}</text><rect x={43} y={n*31+25} width={211} height={18} rx={3} fill={row===n?'#233b40':'#12232d'}/><rect x={x(h.enqueue)} y={n*31+29} width={Math.max(0,x(h.start)-x(h.enqueue))} height={10} rx={2} fill="#ffc078"/><rect x={x(h.start)} y={n*31+29} width={Math.max(.7,x(h.end)-x(h.start))} height={10} rx={2} fill={h.aborted?"#ff8585":"#72ddc5"}/></g>)}
 <line x1={x(time)} x2={x(time)} y1={19} y2={packet.hops.length*31+20} stroke="#ecffd7" strokeWidth="1.4"/>
 </svg><div className="timing-legend"><span><i/>Queue</span><span><i/>On link</span><span>Gaps: propagation / retry · red: aborted</span></div><p><b>{num(queue,2)} µs</b> of this packet’s journey was spent waiting in queues.</p></section>
}
