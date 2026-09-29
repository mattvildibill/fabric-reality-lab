import {Simulation,percentile} from '../lib/fabric/simulator';
import {DEFAULTS} from '../lib/fabric/catalog';
const durations:number[]=[];let events=0;
for(const workload of ['alltoall','physical','checkpoint','elephant'] as const){const s=new Simulation({...DEFAULTS,workload,messageKiB:1024,bufferKiB:32,load:100});while(s.time<1000&&!s.done){const start=performance.now();events+=s.advance(Math.min(1000,s.time+10),2000,8);durations.push(performance.now()-start)}}
console.log(JSON.stringify({chunks:durations.length,events,advanceMs:{p50:percentile(durations,.5),p95:percentile(durations,.95),p99:percentile(durations,.99),max:Math.max(...durations)},note:'Local runtime observation, not a browser or hardware benchmark. Timer checked every 32 events.'}));
