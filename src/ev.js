// RocketSolver v12 / 1.15.0 Q records: little-endian u32 sample count,
// then f32 running EV in milli-big-blinds. Zero samples mean unavailable.
// Native strategy reader: 0x180161cb0–0x180161d3b (upper float / 1000),
// with native UI adding contributed chips for relative EV. See README.
export function attachNodeEv(range,bytes,slots,node){
 if(bytes.byteLength!==slots*169*8)throw new Error('EV dimensions do not match the saved tree.');
 if(!Number.isInteger(node.rowOffset)||node.rowOffset<0||node.rowOffset+node.actions.length>slots)throw new Error('Invalid EV node offset.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let weighted=0,mass=0,missingMass=0,minSamples=Infinity;
 const hands=range.hands.map((hand,h)=>{
  const samples=[],actionEv=node.actions.map((_,a)=>{
   const offset=(h*slots+node.rowOffset+a)*8,count=view.getUint32(offset,true),value=view.getFloat32(offset+4,true);samples.push(count);
   if(!count)return null;
   if(!Number.isFinite(value))throw new Error('Invalid saved EV value.');
   return value/1000;
  });
  let ev=null;
  if(hand.frequencies){
   const complete=hand.frequencies.every((p,a)=>p===0||actionEv[a]!==null);
   if(complete)ev=hand.frequencies.reduce((sum,p,a)=>sum+(p===0?0:p*actionEv[a]),0);
   for(let a=0;a<samples.length;a++)if(hand.frequencies[a]>0)minSamples=Math.min(minSamples,samples[a]);
  }
  if(hand.mass>0){mass+=hand.mass;if(ev===null)missingMass+=hand.mass;else weighted+=hand.mass*ev;}
  return {...hand,ev,actionEv,evSamples:samples};
 });
 return {...range,hands,ev:{status:'experimental',value:mass>0&&missingMass===0?weighted/mass:null,coverage:mass>0?1-missingMass/mass:0,minSamples:Number.isFinite(minSamples)?minSamples:0,basis:'absolute',unit:'BB',note:'Saved action EV × saved strategy; node average uses saved hand weights. Not yet checked against a RocketSolver display/export.'}};
}
export const relativeEv=(value,node)=>value===null||value===undefined?null:value+(node.bets[node.actor]||0)/100;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export function comparisonSettings(solution){const {saveEv,...settings}=solution.settings||{};return JSON.stringify(canonical({parameters:solution.parameters,settings}));}
export const pathKey=path=>JSON.stringify(path.map(({actor,action})=>[actor,action.type,action.type===10?action.amount:null]));
export function findEquivalentNode(solution,path){
 const nodes=new Map(solution.nodes.map(n=>[n.id,n]));let node=nodes.get(0);
 for(const step of path){if(!node||node.actor!==step.actor)return null;const action=node.actions.find(a=>a.type===step.action.type&&(a.type!==10||a.amount===step.action.amount));if(!action||action.terminal)return null;node=nodes.get(action.id);}
 return node?.id??null;
}
export function compareSnapshots(a,b){
 if(!a||!b)return {reason:'Pin a position in the first solution, then open the other solution.'};
 if(a.node.terminal||b.node.terminal)return {reason:'Choose a decision node in both solutions.'};
 if(a.settings!==b.settings)return {reason:'Game or solver settings differ. Match stacks, blinds, rake, ranges and abstractions before comparing.'};
 if(pathKey(a.path)!==pathKey(b.path)||a.node.actor!==b.node.actor||a.node.active!==b.node.active||JSON.stringify(a.node.bets)!==JSON.stringify(b.node.bets))return {reason:'These are different positions. Select the same action path and player in both solutions.'};
 const x=a.range?.ev?.value,y=b.range?.ev?.value;
 if(!Number.isFinite(x)||!Number.isFinite(y))return {reason:'Node EV is unavailable or incomplete at one of these positions.'};
 return {delta:y-x};
}
