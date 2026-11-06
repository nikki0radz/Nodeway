// Display labels inferred from filenames, not decoded solver settings.
export function describeSolution(name){
 const filename=name.split(/[\\/]/).at(-1),stem=filename.replace(/\.rsl$/i,'');
 const opening=stem.match(/RFI\(LJ-BTN(\d+(?:\.\d+)?)bb/i)?.[1];
 const players=stem.match(/^(\d+)H\s/i)?.[1];
 const stack=stem.match(/(?:^|\s)(\d+(?:\.\d+)?)bb\s/i)?.[1];
 const ante=stem.match(/Ante(\d+(?:\.\d+)?)bb/i)?.[1];
 const sb=stem.match(/RFI\([^)]*\bSB(\d+(?:\.\d+)?)bb/i)?.[1];
 const limp=/\bLimpsAll\b/i.test(stem)?'all':/\bSBlimpOnly\b/i.test(stem)?'sb':null;
 return {filename,title:opening?`${opening} BB opening`:stem,opening,players,stack,ante,sb,limp,
  subtitle:limp==='all'?'Limping allowed in all positions':limp==='sb'?'Limping in the small blind only':'Saved RocketSolver solution',
  shortTitle:opening?`${opening} BB opening${limp==='all'?' · All-position limps':limp==='sb'?' · SB limps only':''}`:stem};
}
const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function solutionCard(file,{selected=false,onOpen}){
 const d=describeSolution(file.name),card=element('article',undefined,'file-card'+(selected?' selected':''));
 const button=element('button',undefined,'solution-open');button.type='button';button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',`Open solution ${file.index+1}: ${d.shortTitle}`);button.onclick=onOpen;
 const top=element('div',undefined,'solution-top');top.append(element('span',`SOLUTION ${String(file.index+1).padStart(2,'0')}`,'solution-number'),element('span',selected?'✓ Selected':d.limp==='all'?'All-position limps':d.limp==='sb'?'SB limps only':'Saved solution','solution-kind '+(d.limp||'')));
 const heading=element('div',undefined,'solution-heading');heading.append(element('h3',d.title,'solution-title'),element('span',d.subtitle,'solution-subtitle'));
 const stats=element('div',undefined,'solution-stats');
 for(const [label,value] of [['TABLE',d.players?`${d.players} players`:null],['STACK',d.stack?`${d.stack} BB`:null],['ANTE',d.ante?`${d.ante} BB`:null]])if(value){const stat=element('div');stat.append(element('span',label),element('strong',value));stats.append(stat);}
 const footer=element('div',undefined,'solution-footer');footer.append(element('span',`${(file.size/1024/1024).toFixed(1)} MB`,'solution-size'),element('span',selected?'Explore again ↗':'Explore solution ↗','solution-cta'));
 button.append(top,heading);if(stats.childElementCount)button.append(stats);button.append(footer);
 const details=element('details',undefined,'solution-details');details.append(element('summary','File details'));
 const body=element('div',undefined,'solution-details-body');body.append(element('p','Labels above are read from the filename. The imported save is checked when you open it.','solution-source'));
 if(d.sb)body.append(element('p',`Small blind opening: ${d.sb} BB`,'solution-source'));
 body.append(element('span','ORIGINAL FILENAME','solution-original-label'),element('code',d.filename));details.append(body);card.append(button,details);return card;
}
