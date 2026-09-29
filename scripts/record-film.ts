import fs from 'node:fs';
import {Simulation} from '../lib/fabric/simulator';
import {DEFAULTS} from '../lib/fabric/catalog';
const c={...DEFAULTS,workload:'allreduce' as const,messageKiB:256,trouble:'optical',injectAt:30,repairAt:520};
const a=new Simulation(c),b=new Simulation(c,true);a.finish(350);b.finish(350);
const round=b.collectiveRounds.at(-1)!;const flows=b.flows.filter(f=>f.round===round.round);const slow=flows.reduce((a,b)=>a.end>b.end?a:b);const packet=b.packets.filter(p=>p.flow===slow.id&&p.done).sort((a,b)=>b.done!-a.done!)[0];
const output={config:c,healthy:a.collectiveEnd,impaired:b.collectiveEnd,delta:b.collectiveEnd-a.collectiveEnd,percent:(b.collectiveEnd/a.collectiveEnd-1)*100,links:b.affectedLinks.length,slowRank:slow.src,packet:{id:packet.id,src:packet.src,dst:packet.dst,duration:packet.done!-packet.born,wait:packet.hops.reduce((s,h)=>s+h.start-h.enqueue,0),hops:packet.hops.map(h=>({queue:h.queue,wait:h.start-h.enqueue,transmit:h.end-h.start}))},timeline:Array.from({length:121},(_,i)=>{const t=i===120?b.collectiveEnd:i*b.collectiveEnd/120;return {t,healthy:a.flows.filter(f=>f.end>0&&f.end<=t).length/896,impaired:b.flows.filter(f=>f.end>0&&f.end<=t).length/896}})};
fs.writeFileSync('lib/fabric/film-recording.json',JSON.stringify(output));console.log('Recorded deterministic film evidence.');
