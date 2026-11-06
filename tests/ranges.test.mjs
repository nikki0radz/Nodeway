import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HANDS,decodeNodeRange,createRangeReader} from '../src/ranges.js';
import {parseRsl,directory} from '../src/rsl.js';
import {createNavigationIndex} from '../src/views.js';
const root=process.env.NODEWAY_FIXTURES;
test('range grid covers 169 distinct classes and 1326 combinations',()=>{
 assert.equal(HANDS.length,169);assert.equal(new Set(HANDS.map(h=>h.label)).size,169);assert.equal(HANDS.reduce((s,h)=>s+h.combos,0),1326);
});
test('normalizes saved weights, preserves missing weight and rejects invalid values',()=>{
 const bytes=new Uint8Array(169*3*8),v=new DataView(bytes.buffer);v.setFloat64(0,20,true);v.setFloat64(8,30,true);v.setFloat64(16,50,true);
 const node={id:0,actor:2,rowOffset:0,actions:[{id:1,type:1},{id:2,type:3},{id:3,type:10,amount:3}]};
 let r=decodeNodeRange(bytes,3,node);assert.deepEqual(r.hands[0].frequencies,[.2,.3,.5]);assert.equal(r.hands[1].frequencies,null);
 v.setFloat64(0,NaN,true);assert.throws(()=>decodeNodeRange(bytes,3,node),/Invalid saved range/);
});
for(let i=1;i<=4;i++)test(`save ${i}: ranges, cross-player navigation and endpoints`,{skip:!root},async()=>{
 const raw=new Uint8Array(await readFile(`${root}/sample-${i}.rsl`)),solution=await parseRsl(raw,`sample-${i}.rsl`),index=createNavigationIndex(solution),read=createRangeReader(raw,solution);
 const start=await read(0);assert.equal(start.status,'experimental');assert.equal(start.hands.length,169);
 // Uniform initial card reach should scale as the number of combinations.
 const mass=start.hands.map(h=>h.mass/h.combos),mean=mass.reduce((s,x)=>s+x,0)/169;
 assert.ok(mass.every(m=>Math.abs(m/mean-1)<.03));
 let node=solution.nodes[0];for(let step=0;step<6;step++){
  const range=await read(node.id);assert.equal(range.nodeId,node.id);assert.equal(range.actor,node.actor);
  for(const h of range.hands)if(h.frequencies)assert.ok(Math.abs(h.frequencies.reduce((s,v)=>s+v,0)-1)<1e-10);
  const action=step===0?node.actions.at(-1):node.actions.find(a=>a.type===1);
  assert.equal(index.pathTo(action.id).at(-1).action.id,action.id);
  if(action.terminal){await assert.rejects(read(action.id),/endpoint/);break;}node=index.nodes.get(action.id);
 }
});
test('damaged compressed range is rejected without replacing tree data',{skip:!root},async()=>{
 const raw=new Uint8Array(await readFile(`${root}/sample-4.rsl`)),solution=await parseRsl(raw,'test'),container=await directory(raw);raw[container.entries.get('R_2_0').start+30]^=1;
 await assert.rejects(createRangeReader(raw,solution)(0),/invalid zstd data|authentication/);
});
