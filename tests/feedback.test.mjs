import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBatch,prepareBatch,emailPayload,matchesReceipt,createEmailForm,EMAIL_ENDPOINT} from '../src/feedback-data.js';
const comment={id:'comment-1',comment:'Please move this button',target:{selector:'#back',text:'Back one action'},context:{nodeId:123,path:[{player:'EP',action:'Raise to 3 BB'}]}};
const batch=makeBatch([comment],'batch-1','2026-11-06T14:00:00Z');
test('email uses the requested address and includes lossless JSON in both attachment and body',()=>{
 const payload=emailPayload(batch,'nonce-1','https://nikki0radz.github.io/Nodeway/dist/?v=123#viewer');
 assert.equal(payload.action,'https://formsubmit.co/hello@tanglevia.com');assert.equal(payload.action,EMAIL_ENDPOINT);
 assert.deepEqual(JSON.parse(payload.json),batch);assert.equal(payload.fields.feedback_json,payload.json);
 assert.equal(payload.filename,'nodeway-comments-batch-1.json');assert.ok(!('_captcha' in payload.fields));
 const next=new URL(payload.fields._next);assert.equal(next.pathname,'/Nodeway/dist/email-result.html');assert.equal(next.searchParams.get('receipt'),'nonce-1');assert.equal(next.searchParams.get('batch'),'batch-1');assert.equal(next.hash,'');
});
test('hosting root and concept page use the correct receipt URL',()=>{
 for(const page of ['https://nodeway.nikki0radz.chatgpt.site/','https://nodeway.nikki0radz.chatgpt.site/concepts.html#concept/6'])assert.equal(new URL(emailPayload(batch,'nonce',page).fields._next).pathname,'/email-result.html');
});
test('opening a handoff or a mismatched receipt cannot mark drafts accepted',()=>{
 const pending={transport:'email',batch,nonce:'nonce-1'};
 assert.equal(matchesReceipt(null,pending),false);assert.equal(matchesReceipt({batchId:'batch-1',nonce:'other',acceptedAt:'now'},pending),false);
 assert.equal(matchesReceipt({batchId:'other',nonce:'nonce-1',acceptedAt:'now'},pending),false);
 assert.equal(matchesReceipt({batchId:'batch-1',nonce:'nonce-1'},pending),false);
 assert.equal(matchesReceipt({batchId:'batch-1',nonce:'nonce-1',acceptedAt:'now'},batch),false);
 assert.equal(matchesReceipt({batchId:'batch-1',nonce:'nonce-1',acceptedAt:'now'},pending),true);
});
test('resend batches preserve comments without old transport markers',()=>{
 const resend=makeBatch([{...comment,submitted:123,emailAccepted:'yesterday'}],'new-id');assert.deepEqual(resend.comments,[comment]);
});
test('large sets are bounded without mutating remaining drafts',()=>{
 const comments=Array.from({length:120},(_,i)=>({...comment,id:String(i),comment:'x'.repeat(2500)}));
 const batch=prepareBatch(comments,'bounded');assert.ok(batch.comments.length>0&&batch.comments.length<comments.length);assert.ok(JSON.stringify(batch).length<=200000);assert.equal(comments.length,120);
});
test('multipart form contains a JSON File, not just a filename or mailto link',async()=>{
 const previous=globalThis.DataTransfer;
 globalThis.DataTransfer=class {files=[];items={add:file=>this.files.push(file)}};
 const doc={createElement:tag=>({tag,dataset:{},children:[],append(child){this.children.push(child)}})};
 try{const payload=emailPayload(batch,'nonce','https://example.com/dist/');const form=createEmailForm(payload,doc);
  assert.equal(form.method,'POST');assert.equal(form.enctype,'multipart/form-data');assert.equal(form.target,'_blank');assert.equal(form.rel,'noopener');
  const attachment=form.children.find(c=>c.name==='attachment');assert.equal(attachment.files.length,1);assert.equal(attachment.files[0].type,'application/json');assert.deepEqual(JSON.parse(await attachment.files[0].text()),batch);
  assert.equal(form.children.find(c=>c.name==='feedback_json').value,payload.json);
 }finally{if(previous===undefined)delete globalThis.DataTransfer;else globalThis.DataTransfer=previous;}
});
