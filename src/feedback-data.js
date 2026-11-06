export const DRAFT_KEY='nodeway-design-comments-v1';
export const RECEIPT_KEY='nodeway-email-receipt-v1';
export const EMAIL_RECIPIENT='hello@tanglevia.com';
export const EMAIL_ENDPOINT=`https://formsubmit.co/${EMAIL_RECIPIENT}`;
export function makeBatch(comments,id,createdAt=new Date().toISOString()){
 return {schema:'nodeway-design-feedback/v1',batchId:id,createdAt,comments:comments.map(({submitted,emailAccepted,...comment})=>comment)};
}
export function prepareBatch(comments,id){
 const batch=makeBatch([],id);
 for(const comment of comments){const next=makeBatch([...batch.comments,comment],id,batch.createdAt);if(JSON.stringify(next).length>200000&&batch.comments.length)break;batch.comments=next.comments;}
 return batch;
}
export function emailPayload(batch,nonce,pageUrl){
 const json=JSON.stringify(batch,null,2),receipt=new URL('email-result.html',pageUrl);
 receipt.search='';receipt.hash='';receipt.searchParams.set('batch',batch.batchId);receipt.searchParams.set('receipt',nonce);
 const source=new URL(pageUrl);source.search='';
 return {action:EMAIL_ENDPOINT,filename:`nodeway-comments-${batch.batchId}.json`,json,fields:{
  _subject:`Nodeway comments for Nicole (${batch.comments.length}) — ${batch.batchId}`,
  _next:receipt.href,_url:source.href,_template:'basic',
  message:`${batch.comments.length} design comment(s) for Nicole. Batch: ${batch.batchId}. The JSON is attached and also included below. No solution files or strategy arrays are included.`,
  feedback_json:json
 }};
}
export function matchesReceipt(receipt,pending){
 return !!(receipt&&pending?.transport==='email'&&receipt.batchId===pending.batch.batchId&&receipt.nonce===pending.nonce&&receipt.acceptedAt);
}
export function createEmailForm(payload,doc=document){
 const form=doc.createElement('form');form.method='POST';form.action=payload.action;form.enctype='multipart/form-data';form.target='_blank';form.rel='noopener';form.hidden=true;form.dataset.feedbackUi='';
 for(const [name,value] of Object.entries(payload.fields)){const input=doc.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);}
 const attachment=doc.createElement('input');attachment.type='file';attachment.name='attachment';attachment.accept='.json,application/json';
 const transfer=new DataTransfer();transfer.items.add(new File([payload.json],payload.filename,{type:'application/json'}));attachment.files=transfer.files;
 if(attachment.files.length!==1)throw new Error('This browser could not attach the JSON. Download the backup and email it to Nicole instead.');
 form.append(attachment);return form;
}

export function directEmailPayload(batch){
 const filename=`nodeway-comments-${batch.batchId}.json`,json=JSON.stringify(batch,null,2);
 const subject=`Nodeway comments for Nicole (${batch.comments.length})`;
 const intro=`Hi Nicole, here are my Nodeway comments.\n\n`;
 const text=intro+batch.comments.map((c,i)=>`${i+1}. ${c.comment}\nElement: ${c.target?.panel||c.target?.text||c.target?.tag||'Page'}\nPage: ${c.page?.path||''}${c.page?.hash||''}\nDetails: ${JSON.stringify({target:c.target,context:c.context,viewport:c.viewport})}`).join('\n\n');
 const base=`mailto:${EMAIL_RECIPIENT}?subject=${encodeURIComponent(subject)}&body=`;
 const complete=base+encodeURIComponent(text);
 const needsAttachment=complete.length>1800;
 const body=needsAttachment?intro+`I have attached ${filename} with the comments and element details.\n\n[Attach the downloaded JSON file before sending.]`:text;
 return {filename,json,text,subject,needsAttachment,href:base+encodeURIComponent(body)};
}
