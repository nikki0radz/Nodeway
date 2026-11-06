import {createViews,createNavigationIndex} from './views.js';
import {describeSolution,solutionCard} from './solution-card.js';
const $=id=>document.getElementById(id),positions=['SB','BB','EP','MP','CO','BTN'];
let worker,solution,nodeMap,history=[],archiveFiles=[],busy=false,selectedIndex=null,navIndex,trail=[],currentRange=null,rangeError=null,rangeRequest=0,solutionSerial=0;
const el=(tag,text,className)=>{const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;};
const shortName=name=>name.split(/[\\/]/).at(-1);
const label=a=>a.type===1?'Fold':a.type===2?'Check':a.type===3?'Call':`Raise to ${a.amount} BB`;
function setBusy(value){busy=value;$('cancel').hidden=!value;$('file').disabled=value;document.querySelectorAll('.solution-open').forEach(b=>b.disabled=value);}
function showError(message){$('error').textContent=message;$('error').hidden=false;$('status').hidden=true;setBusy(false);}
const views=createViews($('selected-views'),$('view-controls'),{
 navigate:id=>{history=navIndex.pathTo(id);trail=[...history];renderNode();requestRange();},
 go:depth=>go(depth),replay:depth=>{history=trail.slice(0,Math.max(0,Math.min(trail.length,depth)));renderNode();requestRange();},
 retryRange:()=>requestRange(),download
});
function requestRange(){
 currentRange=null;rangeError=null;const n=current();const requestId=++rangeRequest;
 renderNode();if(!n.terminal)worker.postMessage({type:'range',nodeId:n.id,requestId,solutionSerial});
}
function startWorker(){worker?.terminate();worker=new Worker(new URL(__NODEWAY_WORKER_URL__,location.href));worker.onerror=event=>showError('Importer stopped: '+(event.message||'worker script could not be loaded')+'. Refresh and try again, or use a single extracted .rsl file.');worker.onmessage=({data})=>{
 if(data.type==='progress'){$('status').hidden=false;$('status').textContent=data.message;}
 if(data.type==='error')showError(data.message);
 if((data.type==='range'||data.type==='range-error')&&data.requestId===rangeRequest&&data.solutionSerial===solutionSerial){if(data.type==='range')currentRange=data.range;else rangeError=data.message;renderNode();}
 if(data.type==='archive'){archiveFiles=data.files;renderArchive();setBusy(false);$('status').hidden=true;}
 if(data.type==='solution'){solution=data.solution;solutionSerial=data.solutionSerial;navIndex=createNavigationIndex(solution);nodeMap=navIndex.nodes;history=[];trail=[];currentRange=null;rangeError=null;setBusy(false);$('status').hidden=true;renderSolution();requestRange();$('viewer').scrollIntoView({behavior:'smooth',block:'start'});}
};}
function openFile(file){if(!file||busy)return;views.clear();rangeRequest++;solution=null;currentRange=null;rangeError=null;trail=[];history=[];archiveFiles=[];selectedIndex=null;$('viewer').hidden=true;$('archive').hidden=true;$('error').hidden=true;setBusy(true);$('status').hidden=false;$('status').textContent='Starting local import…';startWorker();worker.postMessage({type:'open',file});}
function renderArchive(){
 $('archive').hidden=false;$('file-count').textContent=`${archiveFiles.length} solutions`;$('files').replaceChildren();
 for(const file of archiveFiles)$('files').append(solutionCard(file,{selected:file.index===selectedIndex,onOpen:()=>{
  if(busy)return;views.clear();rangeRequest++;currentRange=null;selectedIndex=file.index;renderArchive();$('viewer').hidden=true;$('error').hidden=true;setBusy(true);worker.postMessage({type:'select',index:file.index});
 }}));
}
function current(){const last=history.at(-1);return last?.action.terminal?{...last.action,terminal:true,action:last.action}:nodeMap.get(last?.action.id??0);}
function renderSolution(){
 $('viewer').hidden=false;$('solution-title').textContent=describeSolution(solution.name).shortTitle;$('solution-title').title=shortName(solution.name);$('solution-meta').textContent=`RocketSolver ${solution.savedVersion} · ${solution.totalNodes.toLocaleString()} tree nodes · ${solution.nodes.length.toLocaleString()} preflop decisions`;
 $('checks').replaceChildren(...solution.checks.map(c=>el('span',c)));renderNode();
}
function go(depth){views.stop();history=history.slice(0,Math.max(0,depth));renderNode();requestRange();}
function renderNode(){
 if(!solution)return;
 const n=current();$('breadcrumbs').replaceChildren();const root=el('button','Start · EP to act','crumb'+(!history.length?' current':''));root.onclick=()=>go(0);$('breadcrumbs').append(root);
 history.forEach((h,i)=>{const b=el('button',`${positions[h.actor]} · ${label(h.action)}`,'crumb'+(i===history.length-1?' current':''));b.onclick=()=>go(i+1);$('breadcrumbs').append(b);});
 $('back').disabled=$('reset').disabled=!history.length;
 // Never display a range from a previous node while a new request is pending.
 views.update({solution,node:n,index:navIndex,history,trail,range:currentRange?.nodeId===n.id?currentRange:null,rangeError});
}
$('file').onchange=e=>{openFile(e.target.files[0]);e.target.value='';};
for(const event of ['dragenter','dragover'])$('drop').addEventListener(event,e=>{e.preventDefault();if(!busy)$('drop').classList.add('drag');});
for(const event of ['dragleave','drop'])$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.remove('drag');});
$('drop').addEventListener('drop',e=>openFile(e.dataTransfer.files[0]));
$('cancel').onclick=()=>{worker?.terminate();views.clear();rangeRequest++;solution=null;currentRange=null;archiveFiles=[];history=[];trail=[];$('viewer').hidden=true;$('archive').hidden=true;setBusy(false);$('status').hidden=false;$('status').textContent='Import cancelled. Choose a file to start again.';};
$('back').onclick=()=>go(history.length-1);$('reset').onclick=()=>go(0);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('report').onclick=()=>{const {nodes,...report}=solution;download(new Blob([JSON.stringify({...report,preflopDecisions:nodes.length,path:history.map(h=>({player:positions[h.actor],action:label(h.action),node:h.action.id})),limitations:['Ranges decode saved R section weights using an experimental hand mapping, not independently verified against RocketSolver.','EV, equity and postflop ranges are not displayed.','The final 32 footer bytes are not interpreted.']},null,2)],{type:'application/json'}),'nodeway-import-report.json');};
$('image').onclick=()=>{
 const n=current(),lines=['Start · EP to act',...history.map(h=>`${positions[h.actor]} · ${label(h.action)}`)],canvas=document.createElement('canvas');canvas.width=1400;canvas.height=Math.max(780,400+lines.length*48);const c=canvas.getContext('2d');c.fillStyle='#131b1b';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#dcf58c';c.font='bold 38px system-ui';c.fillText('Nodeway / Saved preflop path',70,85);c.fillStyle='#a5b4af';c.font='18px system-ui';
 const name=shortName(solution.name);c.fillText(name.length>110?name.slice(0,107)+'…':name,70,135);c.fillText(`RocketSolver ${solution.savedVersion} · Node ${n.terminal?n.action.id:n.id}`,70,170);
 lines.forEach((line,i)=>{c.fillStyle=i===lines.length-1?'#dcf58c':'#eff2e9';c.font='24px system-ui';c.fillText(`${String(i).padStart(2,'0')}   ${line}`,85,240+i*48);});
 c.fillStyle='#a5b4af';c.font='18px system-ui';c.fillText(n.terminal?'End of preflop path':`Next: ${positions[n.actor]} — ${n.actions.map(label).join(' / ')}`,70,canvas.height-120);c.fillText('Experimental viewer · Range mapping is unverified. EV and equity are not displayed.',70,canvas.height-65);canvas.toBlob(blob=>{if(blob)download(blob,'nodeway-saved-path.png');},'image/png');
};
