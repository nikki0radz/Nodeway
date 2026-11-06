const $=id=>document.getElementById(id),positions=['SB','BB','EP','MP','CO','BTN'];
let worker,solution,nodeMap,history=[],archiveFiles=[],busy=false,selectedIndex=null;
const el=(tag,text,className)=>{const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;};
const shortName=name=>name.split(/[\\/]/).at(-1);
const label=a=>a.type===1?'Fold':a.type===2?'Check':a.type===3?'Call':`Raise to ${a.amount} BB`;
function setBusy(value){busy=value;$('cancel').hidden=!value;$('file').disabled=value;document.querySelectorAll('.file-card').forEach(b=>b.disabled=value);}
function showError(message){$('error').textContent=message;$('error').hidden=false;$('status').hidden=true;setBusy(false);}
function startWorker(){worker?.terminate();worker=new Worker(new URL('./import-worker.js',location.href));worker.onerror=event=>showError('Importer stopped: '+(event.message||'worker script could not be loaded')+'. Refresh and try again, or use a single extracted .rsl file.');worker.onmessage=({data})=>{
 if(data.type==='progress'){$('status').hidden=false;$('status').textContent=data.message;}
 if(data.type==='error')showError(data.message);
 if(data.type==='archive'){archiveFiles=data.files;renderArchive();setBusy(false);$('status').textContent=`Found ${data.files.length} saved solutions. Choose one below.`;}
 if(data.type==='solution'){solution=data.solution;nodeMap=new Map(solution.nodes.map(n=>[n.id,n]));history=[];setBusy(false);$('status').hidden=true;renderSolution();$('viewer').scrollIntoView({behavior:'smooth',block:'start'});}
};}
function openFile(file){if(!file||busy)return;solution=null;history=[];archiveFiles=[];selectedIndex=null;$('viewer').hidden=true;$('archive').hidden=true;$('error').hidden=true;setBusy(true);$('status').hidden=false;$('status').textContent='Starting local import…';startWorker();worker.postMessage({type:'open',file});}
function renderArchive(){$('archive').hidden=false;$('file-count').textContent=`${archiveFiles.length} solutions`;$('files').replaceChildren();for(const file of archiveFiles){const b=el('button','','file-card'+(file.index===selectedIndex?' selected':''));b.append(el('b',String(file.index+1).padStart(2,'0')));const info=el('div');info.append(el('span',shortName(file.name)),el('small',`${(file.size/1024/1024).toFixed(1)} MB · Open saved path →`));b.append(info);b.onclick=()=>{selectedIndex=file.index;renderArchive();$('viewer').hidden=true;$('error').hidden=true;setBusy(true);worker.postMessage({type:'select',index:file.index});};$('files').append(b);}}
function current(){const last=history.at(-1);return last?.action.terminal?{terminal:true,action:last.action}:nodeMap.get(last?.action.id??0);}
function renderSolution(){
 $('viewer').hidden=false;$('solution-title').textContent=shortName(solution.name);$('solution-meta').textContent=`RocketSolver ${solution.savedVersion} · ${solution.totalNodes.toLocaleString()} tree nodes · ${solution.nodes.length.toLocaleString()} preflop decisions`;
 $('checks').replaceChildren(...solution.checks.map(c=>el('span',c)));renderNode();
}
function go(depth){history=history.slice(0,depth);renderNode();}
function renderNode(){
 const n=current(),terminal=n.terminal,bets=terminal?n.action.bets:n.bets,active=terminal?n.action.active:n.active;
 $('breadcrumbs').replaceChildren();const root=el('button','Start · EP to act','crumb'+(!history.length?' current':''));root.onclick=()=>go(0);$('breadcrumbs').append(root);
 history.forEach((h,i)=>{const b=el('button',`${positions[h.actor]} · ${label(h.action)}`,'crumb'+(i===history.length-1?' current':''));b.onclick=()=>go(i+1);$('breadcrumbs').append(b);});
 $('back').disabled=$('reset').disabled=!history.length;$('node-id').textContent=`Node ${terminal?n.action.id:n.id}`;
 $('pot').textContent=`${Number((bets.reduce((s,b)=>s+b/100,solution.parameters.deadMoney)).toFixed(2))} BB`;
 $('seats').replaceChildren(...positions.map((p,i)=>{const folded=!(active&(1<<i));const s=el('div',p,'seat'+(!terminal&&i===n.actor?' active':'')+(folded?' folded':''));s.append(el('span',folded?'Folded':`${(100-bets[i]/100).toFixed(1)} BB left`));return s;}));
 $('actor').textContent=terminal?'END OF THIS PREFLOP PATH':`${positions[n.actor]} TO ACT`;
 $('decision-title').textContent=terminal?'You’ve reached the end of this path.':'Where does the action go?';
 $('end-note').textContent=terminal?n.action.outcome:'Choose an action stored in this solution. Raise amounts are the total bet, not an additional amount.';
 $('actions').replaceChildren();if(!terminal)for(const a of n.actions){const b=el('button',label(a),a.type===10?'raise':'');b.append(el('small',a.terminal?'End preflop path':'Continue path →'));b.onclick=()=>{history.push({actor:n.actor,action:a});renderNode();};$('actions').append(b);}
}
$('file').onchange=e=>{openFile(e.target.files[0]);e.target.value='';};
for(const event of ['dragenter','dragover'])$('drop').addEventListener(event,e=>{e.preventDefault();if(!busy)$('drop').classList.add('drag');});
for(const event of ['dragleave','drop'])$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.remove('drag');});
$('drop').addEventListener('drop',e=>openFile(e.dataTransfer.files[0]));
$('cancel').onclick=()=>{worker?.terminate();solution=null;archiveFiles=[];history=[];$('viewer').hidden=true;$('archive').hidden=true;setBusy(false);$('status').hidden=false;$('status').textContent='Import cancelled. Choose a file to start again.';};
$('back').onclick=()=>go(history.length-1);$('reset').onclick=()=>go(0);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('report').onclick=()=>{const {nodes,...report}=solution;download(new Blob([JSON.stringify({...report,preflopDecisions:nodes.length,path:history.map(h=>({player:positions[h.actor],action:label(h.action),node:h.action.id})),limitations:['Only the imported settings and tree sections were decoded; range payloads were not read.','Individual hand frequencies, EV and postflop views are not verified or displayed.','The final 32 footer bytes are not interpreted.']},null,2)],{type:'application/json'}),'nodeway-import-report.json');};
$('image').onclick=()=>{
 const n=current(),lines=['Start · EP to act',...history.map(h=>`${positions[h.actor]} · ${label(h.action)}`)],canvas=document.createElement('canvas');canvas.width=1400;canvas.height=Math.max(780,400+lines.length*48);const c=canvas.getContext('2d');c.fillStyle='#131b1b';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#dcf58c';c.font='bold 38px system-ui';c.fillText('Nodeway / Saved preflop path',70,85);c.fillStyle='#a5b4af';c.font='18px system-ui';
 const name=shortName(solution.name);c.fillText(name.length>110?name.slice(0,107)+'…':name,70,135);c.fillText(`RocketSolver ${solution.savedVersion} · Node ${n.terminal?n.action.id:n.id}`,70,170);
 lines.forEach((line,i)=>{c.fillStyle=i===lines.length-1?'#dcf58c':'#eff2e9';c.font='24px system-ui';c.fillText(`${String(i).padStart(2,'0')}   ${line}`,85,240+i*48);});
 c.fillStyle='#a5b4af';c.font='18px system-ui';c.fillText(n.terminal?'End of preflop path':`Next: ${positions[n.actor]} — ${n.actions.map(label).join(' / ')}`,70,canvas.height-120);c.fillText('Experimental viewer · Range percentages and EV are not yet verified or displayed.',70,canvas.height-65);canvas.toBlob(blob=>{if(blob)download(blob,'nodeway-saved-path.png');},'image/png');
};
