import assert from 'node:assert/strict';
import {Simulation} from '../lib/fabric/simulator';
import {DEFAULTS} from '../lib/fabric/catalog';
const config={...DEFAULTS,workload:'allreduce' as const,messageKiB:256,trouble:'optical',injectAt:30,repairAt:520};
const healthy=new Simulation(config),impaired=new Simulation(config,true);healthy.finish(350);impaired.finish(350);
assert.ok(impaired.collectiveEnd>healthy.collectiveEnd);
for(const fault of [false,true])for(const target of [0,29,30,77.5,healthy.collectiveEnd,impaired.collectiveEnd]){
 const direct=new Simulation(config,fault),chunked=new Simulation(config,fault);direct.advance(target,1000000);while(chunked.time<target||(chunked.heap.first&&chunked.heap.first.t<=target))chunked.advance(Math.min(target,chunked.time+8),2000,6);
 assert.equal(direct.bytesDelivered,chunked.bytesDelivered);assert.equal(direct.collectiveEnd,chunked.collectiveEnd);assert.deepEqual(direct.flows,chunked.flows);
}
const round=impaired.collectiveRounds.at(-1)!;const flows=impaired.flows.filter(f=>f.round===round.round);const slow=flows.reduce((a,b)=>a.end>b.end?a:b);const final=impaired.packets.filter(p=>p.flow===slow.id&&p.done).sort((a,b)=>b.done!-a.done!)[0];assert.ok(final);assert.equal(final.done,round.end);assert.equal(slow.end,round.end);
for(const f of flows){const incoming=flows.find(g=>g.dst===f.src)!;assert.ok(round.end-Math.max(f.end,incoming.end)>=0)}
console.log('Cinematic replay: 12 seek equivalence checks, retained final packet, and 128 rank dependency bounds passed.');
