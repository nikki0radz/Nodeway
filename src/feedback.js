import {DRAFT_KEY,RECEIPT_KEY,EMAIL_RECIPIENT,makeBatch,prepareBatch,emailPayload,matchesReceipt,createEmailForm,directEmailPayload} from './feedback-data.js';
export function initFeedback({pause=()=>{},resume=()=>{},context=()=>({})}={}){
 const E=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const B=(text,fn)=>{const b=E('button',text);b.type='button';b.onclick=fn;return b;};
 let enabled=false,target=null,editing=null,hold=null,start=null,frozenContext={},comments=[],pending=null,storageFailed=false;
 try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');comments=Array.isArray(saved.comments)?saved.comments:[];pending=saved.pending?.transport==='email'?saved.pending:null;}catch{storageFailed=true;}
 const ui=E('section',null,'design-ui');ui.dataset.feedbackUi='';
 const toolbar=E('div',null,'design-toolbar');
 const toggle=B('Design mode',()=>setEnabled(!enabled));toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked','false');
 const indicator=E('span','○','design-switch');toggle.prepend(indicator);
 const status=E('span','Browse normally. Switch on to leave a comment.','design-status');status.setAttribute('role','status');
 const review=B('Send comments to Nicole',()=>openReview());toolbar.append(toggle,status,review);ui.append(toolbar);
 const banner=E('details',null,'design-banner');banner.open=true;
 banner.append(E('summary','A little note from Nicole ♡'));
 banner.append(E('p',"Owen, my love, I’ve created you a toggle switch at the top of this screen. If you switch to Design mode, it will pause whatever page you are on, and you can right click or long press on an element to add a comment :)"));
 banner.append(E('p',"This will make it easier for me to make the actual changes, as I’ll have them all in one place and know exactly which element you’re referring to. Click Send comments to Nicole when you're done to open the email options. You can send them whenever."));
 ui.append(banner);document.body.prepend(ui);
 const outline=E('div',null,'design-outline');outline.dataset.feedbackUi='';outline.hidden=true;document.body.append(outline);
 const editor=E('dialog',null,'design-dialog');editor.dataset.feedbackUi='';editor.setAttribute('aria-label','Add a design comment');
 const heading=E('h2','Leave Nicole a comment'),targetLabel=E('p',null,'design-target'),label=E('label','What would you change?');
 const input=E('textarea');input.id='design-comment';input.rows=4;input.maxLength=2500;input.placeholder='The back button is in a weird place. Could we move it?';label.htmlFor=input.id;
 const editorActions=E('div',null,'design-actions');const cancel=B('Cancel',()=>editor.close()),save=B('Save comment',saveComment);save.className='design-primary';editorActions.append(cancel,save);editor.append(heading,targetLabel,label,input,editorActions);document.body.append(editor);
 const dialog=E('dialog',null,'design-dialog design-review');dialog.dataset.feedbackUi='';dialog.setAttribute('aria-label','Review and email comments');document.body.append(dialog);
 function persist(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify({comments,pending}));storageFailed=false;}catch{storageFailed=true;}updateCount();}
 function updateCount(){const count=comments.filter(c=>!c.submitted&&!c.emailAccepted).length;review.textContent=`Send comments to Nicole${count?` (${count})`:''}`;if(storageFailed)status.textContent='Browser storage unavailable. Download a JSON backup before leaving this page.';}
 function setEnabled(value){
  enabled=value;toggle.setAttribute('aria-checked',String(value));indicator.textContent=value?'●':'○';document.body.classList.toggle('design-mode',value);clearHold();outline.hidden=true;
  if(value){pause();frozenContext=structuredClone(context());}else resume();
  status.textContent=value?'Paused · Right click, long press, or click an element to comment.':'Browse normally. Switch on to leave a comment.';updateCount();
 }
 function selector(element){const parts=[];for(let e=element;e&&e!==document.body;e=e.parentElement){if(e.id){parts.unshift('#'+CSS.escape(e.id));break;}const siblings=e.parentElement?[...e.parentElement.children].filter(x=>x.tagName===e.tagName):[];parts.unshift(e.tagName.toLowerCase()+`:nth-of-type(${siblings.indexOf(e)+1})`);}return parts.join(' > ');}
 function describe(element){const panel=element.closest('.view-panel');return {selector:selector(element),tag:element.tagName.toLowerCase(),text:(element.getAttribute('aria-label')||element.innerText||element.textContent||'').trim().slice(0,220),panel:panel?.querySelector('h3')?.textContent||null};}
 function candidate(node){if(!(node instanceof Element)||node.closest('[data-feedback-ui]'))return null;return node.closest('button,a,label,summary,input,textarea,select,.seat,.hand-cell,h1,h2,h3,p,canvas,svg,.view-panel')||node;}
 function highlight(element){if(!element)return;const r=element.getBoundingClientRect();Object.assign(outline.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});outline.hidden=false;}
 function openEditor(element,comment=null){if(editor.open||dialog.open)return;editing=comment;target=comment?.target||describe(element);highlight(element);targetLabel.textContent=`${target.panel?target.panel+' · ':''}${target.text||target.tag}`;input.value=comment?.comment||'';editor.showModal();input.focus();}
 function saveComment(){const value=input.value.trim();if(!value){input.focus();return;}if(editing){editing.comment=value;editing.updatedAt=new Date().toISOString();}else{
 comments.push({id:crypto.randomUUID(),createdAt:new Date().toISOString(),comment:value,target,page:{path:location.pathname,hash:location.hash,title:document.title},viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY},context:frozenContext});}
 persist();editor.close();status.textContent=storageFailed?'Could not save on this device. Download a JSON backup.':'Comment saved on this device. Use Send comments to Nicole when ready.';}
 editor.addEventListener('close',()=>{outline.hidden=true;if(editing)openReview();});
 function clearHold(){clearTimeout(hold);hold=null;start=null;}
 function block(event){event.preventDefault();event.stopImmediatePropagation();}
 // Capture before the app's handlers: clicks, keyboard activation, drops and drags cannot navigate while paused.
 window.addEventListener('click',e=>{if(!enabled||e.target.closest?.('[data-feedback-ui]'))return;block(e);const el=candidate(e.target);if(el)openEditor(el);},true);
 window.addEventListener('contextmenu',e=>{if(!enabled||e.target.closest?.('[data-feedback-ui]'))return;block(e);clearHold();const el=candidate(e.target);if(el)openEditor(el);},true);
 window.addEventListener('pointerdown',e=>{if(!enabled||e.target.closest?.('[data-feedback-ui]'))return;e.stopImmediatePropagation();const el=candidate(e.target);if(e.pointerType==='touch'&&el){start={x:e.clientX,y:e.clientY};hold=setTimeout(()=>{hold=null;openEditor(el);},550);}},true);
 window.addEventListener('pointermove',e=>{if(!enabled||e.target.closest?.('[data-feedback-ui]'))return;e.stopImmediatePropagation();if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)clearHold();if(e.pointerType==='mouse'&&!editor.open&&!dialog.open)highlight(candidate(e.target));},true);
 for(const name of ['pointerup','pointercancel'])window.addEventListener(name,e=>{clearHold();if(enabled&&!e.target.closest?.('[data-feedback-ui]'))e.stopImmediatePropagation();},true);
 for(const name of ['dblclick','beforeinput','input','change','submit','drop','dragstart','dragover'])window.addEventListener(name,e=>{if(enabled&&!e.target.closest?.('[data-feedback-ui]'))block(e);},true);
 window.addEventListener('keydown',e=>{if(!enabled||e.target.closest?.('[data-feedback-ui]'))return;if(e.key==='Escape'){setEnabled(false);return;}if(e.key==='Tab'||(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End'].includes(e.key)&&!e.target.closest?.('input,textarea,select,[contenteditable]')))return;block(e);if(e.key==='Enter'||e.key===' '||e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){const el=candidate(e.target);if(el)openEditor(el);}},true);
 window.addEventListener('scroll',()=>outline.hidden=true,true);
 function downloadBackup(){const a=E('a');const url=URL.createObjectURL(new Blob([JSON.stringify({schema:'nodeway-design-feedback-backup/v1',comments,pending},null,2)],{type:'application/json'}));a.href=url;a.download='nodeway-design-comments.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function openReview(){
  dialog.replaceChildren(E('h2','Your comments for Nicole'));
  dialog.append(E('p','Email your comments to hello@tanglevia.com. The direct email options work without FormSubmit or activation. Only comments and element/page details are included; solution files stay on your device.'));
  const actions=E('div',null,'design-actions');actions.append(B('Close',()=>dialog.close()),B('Download JSON backup',downloadBackup));dialog.append(actions);
  if(storageFailed)dialog.append(E('p','Browser storage is unavailable. Download a backup to avoid losing your comments.','design-warning'));
  const unsent=comments.filter(c=>!c.submitted&&!c.emailAccepted),pendingIds=new Set(pending?.batch.comments.map(c=>c.id)||[]);
  if(!comments.length)dialog.append(E('p','No comments yet. Switch on Design mode and right click or long press an element.'));
  for(const comment of comments){const card=E('article',null,'design-comment-card');card.append(E('strong',comment.target.panel||comment.target.text||comment.target.tag),E('p',comment.comment),E('small',comment.emailAccepted?'Accepted by email service · kept as a backup':comment.submitted?'Previously submitted':pendingIds.has(comment.id)?'Email handoff started · awaiting confirmation':'Saved draft · not emailed'));
   const details=E('details');details.append(E('summary','Element & page details'),E('pre',JSON.stringify({target:comment.target,page:comment.page,viewport:comment.viewport,context:comment.context},null,2)));card.append(details);
   if(!comment.submitted&&!comment.emailAccepted&&!pendingIds.has(comment.id)){const tools=E('div',null,'design-actions');tools.append(B('Edit',()=>{dialog.close();openEditor(null,comment);}),B('Delete',()=>{comments=comments.filter(c=>c.id!==comment.id);persist();openReview();}));card.append(tools);}if(comment.emailAccepted){card.append(B('Queue for resend',()=>{delete comment.emailAccepted;persist();openReview();}));}dialog.append(card);
  }
  if(unsent.length)showDirectEmail(unsent);
  if(pending)showHandoff();else if(unsent.length){
   dialog.append(E('p','Optional automatic service: FormSubmit has been timing out. If you try it, Nicole may need to activate it once and you must resend afterwards to include the attachment. Use direct email above if it fails.','design-small'));
   const button=B('Try FormSubmit instead',()=>sendEmail(unsent));button.className='design-primary';dialog.append(button);
  }
  if(!dialog.open)dialog.showModal();
 }
 function showDirectEmail(unsent){
  const payload=directEmailPayload(makeBatch(unsent,crypto.randomUUID())),box=E('section',null,'design-handoff');
  box.append(E('h3','Direct email'),E('p',payload.needsAttachment?'1. Download the comments file. 2. Open your email and attach that file before sending.':'Open your email to review and send the comments. The comment text and element details are included.'));
  const message=E('p',null,'design-status');message.setAttribute('role','status');
  function download(){const a=E('a'),url=URL.createObjectURL(new Blob([payload.json],{type:'application/json'}));a.href=url;a.download=payload.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const mail=E('a','Open email');mail.href=payload.href;mail.className='design-email-link';
  const actions=E('div',null,'design-actions');actions.append(B('Download comments file',download),mail,B('Copy comments for email',async()=>{try{await navigator.clipboard.writeText(payload.text);message.textContent='Copied. Paste into an email to hello@tanglevia.com and send it.';}catch{message.textContent='Copy unavailable. Download the comments file and attach it to your email.';}}));
  const file=new File([payload.json],payload.filename,{type:'application/json'});
  if(navigator.canShare?.({files:[file]}))actions.append(B('Share comments file',async()=>{try{await navigator.share({files:[file],title:payload.subject,text:`Comments for ${EMAIL_RECIPIENT}`});message.textContent='Returned from sharing. Your backup is still saved.';}catch(error){message.textContent=error.name==='AbortError'?'Sharing cancelled. Your comments are still saved.':'Sharing unavailable. Download the file and attach it to an email.';}}));
  box.append(actions,E('p','If no email app opens, use Copy comments for email and paste into Gmail or your usual email website. Opening an email or copying comments does not send them. Drafts stay saved here.','design-small'),message);dialog.append(box);
 }
 function sendEmail(unsent){
  const attempt=pending||{transport:'email',batch:prepareBatch(unsent,crypto.randomUUID()),nonce:crypto.randomUUID()};
  try{
   const form=createEmailForm(emailPayload(attempt.batch,attempt.nonce,location.href));document.body.append(form);
   pending=attempt;pending.attemptedAt=new Date().toISOString();persist();
   form.requestSubmit();setTimeout(()=>form.remove(),1000);openReview();
  }catch(error){dialog.append(E('p',`Could not start email: ${error.message} Your comments are still saved. You can download the JSON backup and email it to ${EMAIL_RECIPIENT}.`,'design-warning'));}
 }
 function showHandoff(){
  const batch=pending.batch,box=E('section',null,'design-handoff');box.append(E('h3','Finish sending in the new tab'));
  box.append(E('p','Complete any verification on the email service page. Keep this Nodeway tab open so your solution stays loaded. Opening the email service alone does not confirm that anything was sent.'));
  box.append(E('p','If it asks Nicole to activate the form, she should check hello@tanglevia.com (including spam), activate it, and then you can send this batch again.'));
  if(comments.filter(c=>!c.submitted&&!c.emailAccepted).length>batch.comments.length)box.append(E('p',`This batch contains ${batch.comments.length} comments. Remaining drafts can be sent afterwards.`));
  const message=E('p',null,'design-status');message.setAttribute('role','status');
  const check=B('Check email status',()=>{if(!checkReceipt())message.textContent='No confirmation received yet. Finish in the other tab. Your drafts are still saved; if unsure, check with Nicole before sending again.';});
  box.append(check,B('Send this batch again',()=>sendEmail([])),B('Back to editing',()=>{pending=null;persist();openReview();}),message);
  dialog.append(box);
 }
 function checkReceipt(){
  let receipt;try{receipt=JSON.parse(localStorage.getItem(RECEIPT_KEY)||'null');}catch{return false;}
  if(!matchesReceipt(receipt,pending))return false;
  const ids=new Set(pending.batch.comments.map(c=>c.id));comments.forEach(c=>{if(ids.has(c.id))c.emailAccepted=receipt.acceptedAt;});pending=null;persist();
  status.textContent='Email service accepted the comments. A backup is kept on this device.';
  if(dialog.open)openReview();return true;
 }
 window.addEventListener('storage',event=>{if(event.key===RECEIPT_KEY)checkReceipt();});
 window.addEventListener('focus',checkReceipt);
 checkReceipt();
 updateCount();return {get active(){return enabled;}};
}
