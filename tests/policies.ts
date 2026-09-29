import assert from 'node:assert/strict';
import {Simulation} from '../lib/fabric/simulator';
import {DEFAULTS,PROFILES,ProfileId} from '../lib/fabric/catalog';
let cases=0;
for(const profile of Object.keys(PROFILES) as ProfileId[]){for(const policy of [{adaptive:false},{ordered:true},{qos:false},{commonTopology:true},{normalized:false},{receiver:false}]){const s=new Simulation({...DEFAULTS,...policy,profile,messageKiB:64,workload:'physical'});const r=s.finish(20000);assert.equal(r.censored,0);assert.equal(r.bytes,s.flows.reduce((a,f)=>a+f.bytes,0));assert.ok(s.maxQueue<=s.c.bufferKiB*1024);cases++}}
for(const qos of [true,false]){const s=new Simulation({...DEFAULTS,qos});s.heap.a=[];s.flows=[];s.collectiveRounds=[];s.addFlow(0,1,16384,0,0);s.addFlow(0,1,16384,0,0);s.addFlow(0,1,16384,1,.05);s.finish();const order=[...s.packets].sort((a,b)=>a.hops[0].start-b.hops[0].start).map(p=>p.flow);assert.deepEqual(order,qos?[0,2,1]:[0,1,2]);assert.equal(s.packets[0].hops[0].end,16384/(400*125));cases++}
console.log(JSON.stringify({passed:true,cases,coverage:'24 policy/profile combinations; exact non-preemptive priority and FIFO service order'}));
