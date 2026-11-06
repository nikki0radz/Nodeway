import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {directory,parseRsl,readTree,mapPreflop} from '../src/rsl.js';
const root=process.env.NODEWAY_FIXTURES;
const input=async n=>new Uint8Array(await readFile(`${root}/sample-${n}.rsl`));
test('rejects an installer or unrelated file',async()=>{await assert.rejects(directory(new Uint8Array(100)),/not a RocketSolver/);});
test('rejects unsupported versions before decrypting',async()=>{const b=new Uint8Array(100);b.set([82,83,79,76,13]);await assert.rejects(directory(b),/version 12/);});
test('rejects incomplete trees',()=>{const b=new Uint8Array(13);b[0]=1;b[12]=1;assert.throws(()=>readTree(b),/Incomplete/);});
for(let i=1;i<=4;i++)test(`real save ${i}: authenticated import and structural checks`,{skip:!root},async()=>{
 const result=await parseRsl(await input(i),`sample-${i}.rsl`);
 assert.equal(result.totalNodes,[3681164,2238508,3277919,1835263][i-1]);
 assert.equal(result.nodes.length,i%2?22236:9932);
 assert.equal(result.nodes[0].actor,2);
 assert.deepEqual(result.nodes[0].actions.map(a=>a.type),i%2?[3,1,10]:[1,10]);
 assert.equal(result.nodes[0].actions.at(-1).amount,i<=2?2.5:3);
 assert.equal(result.rangeStatus,'unverified');
 // A real branch, not a fabricated fixture: open, fold MP/CO/BTN/SB, BB responds.
 const nodes=new Map(result.nodes.map(n=>[n.id,n]));let node=nodes.get(result.nodes[0].actions.at(-1).id);
 for(const actor of [3,4,5,0]){assert.equal(node.actor,actor);node=nodes.get(node.actions.find(a=>a.type===1).id);}
 assert.equal(node.actor,1);assert.deepEqual(node.actions.map(a=>[a.type,a.amount]),[[3,0],[1,0],[10,13]]);
 assert.equal(node.actions.find(a=>a.type===3).terminal,true);
 assert.equal(node.actions.find(a=>a.type===1).terminal,true);
 // Unsupported game settings must not silently use the six-player assumptions.
 assert.throws(()=>mapPreflop({n:1}, {...result.parameters,bigBlind:2}),/configuration/);
});
test('rejects tampered directory authentication',{skip:!root},async()=>{const b=await input(4);b[b.length-60]^=1;await assert.rejects(directory(b),/authenticated/);});
test('rejects damaged encrypted tree',{skip:!root},async()=>{const b=await input(4),c=await directory(b);b[c.entries.get('B').start+10]^=1;await assert.rejects(parseRsl(b,'damaged'),/authentication/);});
