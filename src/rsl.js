import { Decompress } from 'fzstd';
import { keys } from './format-keys.js';
const MB=1024*1024, decoder=new TextDecoder('utf-8',{fatal:true});
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const u64=(v,p)=>{const n=v.getBigUint64(p,true);check(n<=BigInt(Number.MAX_SAFE_INTEGER),'Invalid integer in save');return Number(n);};
const match=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
export const POSITIONS=['SB','BB','EP','MP','CO','BTN'];
export async function directory(raw){
 check(raw.length<=256*MB,'Save exceeds the 256 MB limit for this preview.');
 check(raw.length>=71&&match(raw,0,[82,83,79,76]),'This is not a RocketSolver .rsl save. Choose the solution file, not the installer.');
 const v=view(raw);check(u64(v,4)===12,'Unsupported RocketSolver save format. This preview supports RSOL version 12.');
 const f=raw.length-59;
 check(match(raw,f,[138,23,5,173])&&raw[f+4]===0,'Unsupported or damaged save footer.');
 const count=v.getUint16(f+5,true),offset=u64(v,f+7);
 check(count>0&&count<=128&&offset>=12&&offset<f,'Invalid save directory.');
 const imported=await Promise.all(keys.map(k=>crypto.subtle.importKey('raw',new Uint8Array(k),'AES-GCM',false,['decrypt'])));
 let clear;
 try{clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:raw.slice(f+15,f+27)},imported[0],raw.slice(offset,f)));}
 catch{throw new Error('The save directory could not be authenticated. It may be damaged or use a different format.');}
 const d=view(clear),entries=new Map();let p=0,end=12;
 for(let i=0;i<count;i++){
  check(match(clear,p,[199,112,185,242]),'Invalid section directory marker.');
  const len=d.getUint16(p+4,true),name=decoder.decode(clear.slice(p+6,p+6+len));p+=6+len;
  check(/^[A-Za-z0-9_]+$/.test(name)&&!entries.has(name),'Invalid or duplicate section name.');
  const flag=clear[p],nonce=clear.slice(p+1,p+8),size=u64(d,p+8),packed=u64(d,p+16),start=u64(d,p+24);p+=32;
  check((flag===0||flag===1)&&start===end&&size<=512*MB&&packed>0&&start+packed<=offset,'Unsupported section bounds.');
  entries.set(name,{name,flag,nonce,size,packed,start});end=start+packed;
 }
 check(p===clear.length&&end===offset,'Unexpected bytes in save directory.');
 return {entries,key:imported[1],raw};
}
export async function section(container,name,limit=64*MB){
 const e=container.entries.get(name);check(e&&e.size<=limit,`Missing or oversized ${name} section.`);
 let payload=container.raw.subarray(e.start,e.start+e.packed);
 if(e.flag){
  const chunkCount=Math.ceil(payload.length/32784),plain=new Uint8Array(payload.length-chunkCount*16);let out=0;
  for(let i=0,p=0;p<payload.length;i++,p+=32784){
   const nonce=new Uint8Array(12);nonce.set(e.nonce);view(nonce).setUint32(7,i,false);
   let chunk;try{chunk=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},container.key,payload.subarray(p,p+32784)));}
   catch{throw new Error(`Section ${name} failed authentication; the save may be damaged.`);}
   plain.set(chunk,out);out+=chunk.length;
  }payload=plain;
 }
 // Saved streams omit the standard Zstandard magic; the frame itself is intact.
 const frame=new Uint8Array(payload.length+4);frame.set([40,181,47,253]);frame.set(payload,4);
 const result=new Uint8Array(e.size);let written=0;
 const stream=new Decompress(chunk=>{check(written+chunk.length<=e.size,'Decompressed section exceeds its declared size.');result.set(chunk,written);written+=chunk.length;});
 stream.push(frame,true);check(written===e.size,'Decompressed section length mismatch.');return result;
}
export function readTree(data){
 const v=view(data),n=u64(v,0);check(n>0&&n<=8000000&&n<=(data.length-8)/5,'Invalid or oversized decision tree.');
 const tags=new Uint8Array(n),counts=new Uint8Array(n),amounts=new Uint32Array(n),ends=new Uint32Array(n),stack=[];let p=8,slots=1;
 for(let i=0;i<n;i++){
  const t=v.getUint32(p,true);p+=4;check([0,1,2,3,10].includes(t),'This tree contains an action type not yet supported.');
  if(t===10){amounts[i]=v.getUint32(p,true);p+=4;}
  check(p<data.length,'Truncated decision tree.');const count=data[p++];tags[i]=t;counts[i]=count;slots+=count-1;
  while(stack.length&&stack.at(-1)[1]===0){ends[stack.pop()[0]]=i;}
  if(stack.length)stack.at(-1)[1]--;else check(i===0,'Multiple roots in decision tree.');
  if(count)stack.push([i,count]);else ends[i]=i+1;
 }
 while(stack.length){const [i,left]=stack.pop();check(left===0,'Incomplete decision tree.');ends[i]=n;}
 check(slots===0&&p===data.length&&tags[0]===0,'Invalid decision tree structure.');
 const children=i=>{const result=[];let j=i+1;for(let k=0;k<counts[i];k++){check(j<n,'Invalid child index.');result.push(j);j=ends[j];}check(j===ends[i],'Invalid subtree.');return result;};
 return {n,tags,counts,amounts,ends,children};
}
export function mapPreflop(tree,params){
 const {n,tags,counts,amounts,children}=tree;
 // Deliberately reject untested game configurations rather than guess turn order.
 check(params.gameType===0&&params.betType===0&&params.initialStreet===0&&params.isHeadsUp===false&&params.bigBlind===1&&params.firstPlayer===3&&params.players?.length===6&&params.players.every((p,i)=>p.position===[9,8,3,2,1,0][i]&&p.initialStack===100&&p.blind===[.5,1,0,0,0,0][i]),'This preview currently supports the supplied six-player, 100 BB preflop configuration only.');
 check(Number.isFinite(params.deadMoney)&&params.deadMoney>=0,'Invalid dead money.');
 const rows=[0,0,0,0,0,0],nodes=[],pending=[{id:0,actor:2,active:63,waiting:63,bets:[50,100,0,0,0,0]}];
 while(pending.length){
  const {id,actor,active,waiting,bets}=pending.pop();if(!counts[id])continue;
  const ids=children(id),record={id,actor,active,bets,rowOffset:rows[actor],actions:[]};rows[actor]+=ids.length;nodes.push(record);const next=[];
  for(const child of ids){
   const t=tags[child];let a=active,w=waiting&~(1<<actor);const b=[...bets],target=Math.max(...b);
   if(t===1)a&=~(1<<actor);
   else if(t===2)check(b[actor]===target,'Unexpected check in preflop tree.');
   else if(t===3)b[actor]=Math.min(10000,target);
   else if(t===10){const value=amounts[child];check(value>target&&value<=10000,'Unsupported raise amount.');b[actor]=value;w=a&~(1<<actor);}
   else throw new Error('Unexpected preflop action.');
   let able=0;for(let i=0;i<6;i++)if((a&(1<<i))&&b[i]<10000)able|=1<<i;w&=able;
   const onlyOne=x=>x>0&&(x&(x-1))===0;
   const terminal=onlyOne(a)||!w||!counts[child]||(onlyOne(able)&&b.every((v,i)=>!(able&(1<<i))||v>=Math.max(...b)));
   record.actions.push({id:child,type:t,amount:amounts[child]/100,terminal,bets:b,active:a,outcome:onlyOne(a)?'Hand ends — remaining player wins the pot.':'Preflop betting complete. Postflop viewing is not available in this preview.'});
   if(!terminal){let actorNext=(actor+1)%6;while(!(w&(1<<actorNext)))actorNext=(actorNext+1)%6;next.push({id:child,actor:actorNext,active:a,waiting:w,bets:b});}
  }pending.push(...next.reverse());
 }
 return {totalNodes:n,nodes,rows};
}
export async function parseRsl(raw,name,onProgress=()=>{}){
 onProgress('Checking save format and directory…');const c=await directory(raw);
 onProgress('Reading game settings…');
 const params=JSON.parse(decoder.decode(await section(c,'A',MB))),settings=JSON.parse(decoder.decode(await section(c,'C',MB))),version=await section(c,'O',1024);
 check(version.length>=8&&u64(view(version),0)===version.length-8,'Invalid saved version.');
 const savedVersion=decoder.decode(version.subarray(8));check(savedVersion==='1.15.0','This preview has only been tested with RocketSolver 1.15.0 saves.');
 check(settings.board?.length===0,'Only preflop saves are supported.');
 onProgress('Reading the saved decision tree…');const tree=readTree(await section(c,'B'));
 onProgress('Connecting preflop decisions…');const mapped=mapPreflop(tree,params);
 for(let i=0;i<6;i++)check(c.entries.get(`R_${i}_0`)?.size===mapped.rows[i]*169*8,'Saved range dimensions do not match the reconstructed tree.');
 return {name,savedVersion,formatVersion:12,parameters:params,totalNodes:mapped.totalNodes,nodes:mapped.nodes,actionSlots:mapped.rows,sections:c.entries.size,rangeStatus:'unverified',checks:['Directory authenticated','Settings and tree decoded','Preflop action counts match saved range dimensions']};
}
