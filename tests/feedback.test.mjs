import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBatch,prepareBatch,issueBody,issueDraft,verifyIssue} from '../src/feedback-data.js';
const comment={id:'comment-1',comment:'Please move this button',target:{selector:'#back',text:'Back one action'},context:{nodeId:123,path:[{player:'EP',action:'Raise to 3 BB'}]}};
const batch=makeBatch([comment],'batch-1','2026-11-06T14:00:00Z');
test('GitHub handoff contains recoverable element and path data, without tokens',()=>{
 const draft=issueDraft(batch),url=new URL(draft.url);assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/nikki0radz/Nodeway/issues/new');assert.equal(url.searchParams.get('body'),draft.body);assert.equal(draft.needsPaste,false);assert.ok(verifyIssue({body:draft.body},batch));assert.ok(!url.searchParams.has('token'));
});
test('opening a draft, partial upload or matching title alone cannot confirm success',()=>{
 assert.equal(verifyIssue({title:'[Design feedback] batch-1'},batch),false);
 assert.equal(verifyIssue({body:issueBody({...batch,comments:[]})},batch),false);
 assert.equal(verifyIssue({body:issueBody({...batch,batchId:'other'})},batch),false);
 assert.equal(verifyIssue({body:issueBody(batch),pull_request:{}},batch),false);
});
test('long feedback uses paste handoff without truncating comments',()=>{
 const big=makeBatch(Array.from({length:20},(_,i)=>({...comment,id:String(i),comment:'Very useful feedback '.repeat(100)})),'batch-long');
 const draft=issueDraft(big);assert.equal(draft.needsPaste,true);assert.ok(draft.url.length<1000);assert.ok(verifyIssue({body:draft.body},big));
});
test('code fences and HTML in comments stay JSON content',()=>{
 const dangerous=makeBatch([{...comment,comment:'```\n<img onerror=alert(1)>\n@hello'}],'batch-test');
 const body=issueBody(dangerous);assert.equal((body.match(/```/g)||[]).length,2);assert.ok(!body.includes('<img'));assert.ok(verifyIssue({body},dangerous));
});

test('large review sets become bounded batches without losing remaining drafts',()=>{
 const comments=Array.from({length:60},(_,i)=>({...comment,id:String(i),comment:'x'.repeat(2500)}));
 const batch=prepareBatch(comments,'bounded');assert.ok(batch.comments.length>0);assert.ok(batch.comments.length<comments.length);assert.ok(issueBody(batch).length<=55000);assert.equal(comments.length,60);
});
