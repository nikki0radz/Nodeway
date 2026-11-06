import {directory,section} from './rsl.js';
// Inferred from the supplied v12 arrays: triangular pairs/offsuit, then suited.
// This order and the normalized average weights remain experimental until
// checked against an independent RocketSolver export for the same nodes.
export const RANKS='23456789TJQKA';
export const HANDS=[];
for(let high=0;high<13;high++)for(let low=0;low<=high;low++)HANDS.push({label:RANKS[high]+RANKS[low]+(high===low?'':'o'),combos:high===low?6:12});
for(let high=1;high<13;high++)for(let low=0;low<high;low++)HANDS.push({label:RANKS[high]+RANKS[low]+'s',combos:4});
export function decodeNodeRange(bytes,slots,node){
 if(bytes.byteLength!==slots*169*8)throw new Error('Range section dimensions do not match the saved tree.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),count=node.actions.length;
 if(!Number.isInteger(node.rowOffset)||node.rowOffset<0||node.rowOffset+count>slots)throw new Error('Invalid node range offset.');
 const totals=Array(count).fill(0),hands=HANDS.map((hand,h)=>{
  const weights=node.actions.map((_,a)=>view.getFloat64((h*slots+node.rowOffset+a)*8,true));
  if(weights.some(w=>!Number.isFinite(w)||w<0))throw new Error('Invalid saved range weights.');
  const mass=weights.reduce((s,w)=>s+w,0);if(!Number.isFinite(mass))throw new Error('Saved range weight overflow.');weights.forEach((w,a)=>totals[a]+=w);
  return {...hand,index:h,mass,frequencies:mass>0?weights.map(w=>w/mass):null};
 });
 const total=totals.reduce((s,w)=>s+w,0);if(!Number.isFinite(total))throw new Error('Saved range total overflow.');
 return {nodeId:node.id,actor:node.actor,status:'experimental',hands,mix:total>0?totals.map(w=>w/total):null,actions:node.actions.map(({id,type,amount})=>({id,type,amount})),note:'Decoded saved weights; hand mapping and percentages have not been independently verified against RocketSolver.'};
}
export function createRangeReader(raw,solution){
 let containerPromise,cache;const nodes=new Map(solution.nodes.map(n=>[n.id,n]));
 return async nodeId=>{
  const node=nodes.get(nodeId);if(!node)throw new Error('No decision range is available at this preflop endpoint.');
  const container=await (containerPromise??=directory(raw));
  // Keep only one player's section in memory. Concurrent requests share its promise.
  if(cache?.actor!==node.actor)cache={actor:node.actor,bytes:section(container,`R_${node.actor}_0`)};
  const entry=cache;try{return decodeNodeRange(await entry.bytes,solution.actionSlots[node.actor],node);}catch(error){if(cache===entry)cache=null;throw error;}
 };
}
