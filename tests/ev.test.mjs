import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {attachNodeEv,relativeEv,comparisonSettings,findEquivalentNode,compareSnapshots} from '../src/ev.js';
import {decodeNodeRange,createRangeReader} from '../src/ranges.js';
import {parseRsl,directory,section} from '../src/rsl.js';
const node={id:0,actor:0,rowOffset:0,bets:[50,100,0,0,0,0],active:63,actions:[{id:1,type:1},{id:2,type:3}]};
function fixture(){const r=new Uint8Array(169*16),q=new Uint8Array(r.length),rv=new DataView(r.buffer),qv=new DataView(q.buffer);rv.setFloat64(0,1,true);rv.setFloat64(8,3,true);qv.setUint32(0,20,true);qv.setFloat32(4,-500,true);qv.setUint32(8,10,true);qv.setFloat32(12,1500,true);return {r,q,rv,qv};}
test('decodes signed milli-BB means and strategy weighting, without dividing by sample count',()=>{const {r,q}=fixture(),result=attachNodeEv(decodeNodeRange(r,2,node),q,2,node);assert.deepEqual(result.hands[0].actionEv,[-.5,1.5]);assert.equal(result.hands[0].ev,1);assert.equal(result.ev.value,1);assert.equal(relativeEv(result.ev.value,node),1.5);assert.equal(result.hands[1].ev,null);});
test('missing EV on a played action blocks the node average, zero strategy does not',()=>{const {r,q,rv,qv}=fixture();qv.setUint32(8,0,true);let result=attachNodeEv(decodeNodeRange(r,2,node),q,2,node);assert.equal(result.ev.value,null);assert.equal(result.ev.coverage,0);rv.setFloat64(8,0,true);result=attachNodeEv(decodeNodeRange(r,2,node),q,2,node);assert.equal(result.ev.value,-.5);qv.setFloat32(4,NaN,true);assert.throws(()=>attachNodeEv(decodeNodeRange(r,2,node),q,2,node),/Invalid saved EV/);assert.throws(()=>attachNodeEv(decodeNodeRange(r,2,node),q.slice(8),2,node),/dimensions/);});
test('different node IDs can match; different actions, actors or rake cannot silently compare',()=>{
 const a={node,range:{ev:{value:.2}},path:[],settings:'same'},b={...a,node:{...node,id:99,actions:[...node.actions,{type:10,amount:3}]},range:{ev:{value:.3}}};assert.ok(Math.abs(compareSnapshots(a,b).delta-.1)<1e-10);
 assert.match(compareSnapshots(a,{...b,settings:'other'}).reason,/settings differ/);
 assert.match(compareSnapshots(a,{...b,node:{...b.node,actor:1}}).reason,/different positions/);
 assert.match(compareSnapshots(a,{...b,path:[{actor:0,action:{type:3}}]}).reason,/different positions/);
 assert.match(compareSnapshots(a,{...b,range:{ev:{value:null}}}).reason,/unavailable/);
 const sol={nodes:[{...node,actions:[{id:55,type:10,amount:3}]},{id:55,actor:1,actions:[]}]};assert.equal(findEquivalentNode(sol,[{actor:0,action:{type:10,amount:3}}]),55);assert.equal(findEquivalentNode(sol,[{actor:0,action:{type:10,amount:2.5}}]),null);
 assert.equal(comparisonSettings({parameters:{a:1},settings:{rake:0,saveEv:[1000]}}),comparisonSettings({parameters:{a:1},settings:{saveEv:[0],rake:0}}));assert.notEqual(comparisonSettings({settings:{rake:0}}),comparisonSettings({settings:{rake:5}}));
});
const root=process.env.NODEWAY_FIXTURES;
for(let i=1;i<=4;i++)test(`save ${i}: EV has samples and fold EV equals contributed chips`,{skip:!root},async()=>{
 const raw=new Uint8Array(await readFile(`${root}/sample-${i}.rsl`)),solution=await parseRsl(raw,'test'),read=createRangeReader(raw,solution),range=await read(0);assert.equal(range.ev.status,'experimental');assert.ok(Number.isFinite(range.ev.value));assert.equal(range.ev.coverage,1);
 const container=await directory(raw);let checked=0;
 for(let actor=0;actor<6;actor++){
  const bytes=await section(container,`Q_${actor}_0`),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),slots=solution.actionSlots[actor];
  for(const n of solution.nodes.filter(n=>n.actor===actor)){
   const fold=n.actions.findIndex(a=>a.type===1);if(fold<0)continue;
   for(let h=0;h<169;h++){const offset=(h*slots+n.rowOffset+fold)*8;if(v.getUint32(offset,true)){checked++;assert.ok(Math.abs(v.getFloat32(offset+4,true)/1000+n.bets[actor]/100)<.0001,`node ${n.id} hand ${h}`);}}
  }
 }
 assert.ok(checked>100000);console.log(`save ${i}: ${checked} sampled fold values checked; root EV ${range.ev.value.toFixed(6)} BB`);
});
