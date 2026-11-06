import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const archive=process.env.NODEWAY_ARCHIVE;
test('built browser worker imports the real RAR and selects all four saves',{skip:!archive,timeout:120000},async()=>{
 const events=[],self={location:{href:'https://nodeway.test/import-worker.js'},postMessage:event=>events.push(event)};
 const context=vm.createContext({self,crypto,WebAssembly,TextDecoder,TextEncoder,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,Blob,File,atob,console,setTimeout,clearTimeout,importScripts:()=>{throw new Error('Unexpected external script');}});
 vm.runInContext(await readFile('dist/import-worker.js','utf8'),context);
 await self.onmessage({data:{type:'open',file:new File([await readFile(archive)],'solutions.rar')}});
 let error=events.find(e=>e.type==='error');assert.equal(error,undefined,error?.message);
 const listing=events.find(e=>e.type==='archive');assert.equal(listing.files.length,4);
 for(let i=0;i<4;i++){
  events.length=0;await self.onmessage({data:{type:'select',index:i}});
  error=events.find(e=>e.type==='error');assert.equal(error,undefined,error?.message);
  const solution=events.find(e=>e.type==='solution')?.solution;
  assert.equal(solution?.nodes.length,i%2===0?22236:9932);
  assert.equal(solution?.totalNodes,[3681164,2238508,3277919,1835263][i]);
  const serial=events.find(e=>e.type==='solution').solutionSerial;events.length=0;
  await self.onmessage({data:{type:'range',nodeId:0,requestId:41,solutionSerial:serial}});
  const range=events.find(e=>e.type==='range');assert.equal(range?.requestId,41);assert.equal(range?.range.hands.length,169);
  events.length=0;await self.onmessage({data:{type:'range',nodeId:0,requestId:42,solutionSerial:serial-1}});
  assert.equal(events.at(-1).type,'range-error');
 }
 events.length=0;await self.onmessage({data:{type:'select',index:999}});assert.equal(events.at(-1).type,'error');
});
