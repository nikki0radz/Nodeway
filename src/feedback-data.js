export const REPOSITORY='nikki0radz/Nodeway';
export const DRAFT_KEY='nodeway-design-comments-v1';
export function makeBatch(comments,id,createdAt=new Date().toISOString()){
 return {schema:'nodeway-design-feedback/v1',batchId:id,createdAt,comments:comments.map(({submitted,...comment})=>comment)};
}
export function issueBody(batch){
 // JSON escapes prevent user text from breaking out of the Markdown code fence.
 const json=JSON.stringify(batch,null,2).replaceAll('`','\\u0060').replaceAll('<','\\u003c').replaceAll('>','\\u003e');
 return `Design feedback for Nicole — ${batch.comments.length} comment(s).\n\nBatch: ${batch.batchId}\n\nThe JSON below identifies the elements and the selected page/path. Solution files and strategy arrays are not included.\n\n\`\`\`json\n${json}\n\`\`\``;
}
export function issueDraft(batch){
 const body=issueBody(batch),url=new URL(`https://github.com/${REPOSITORY}/issues/new`);
 url.searchParams.set('title',`[Design feedback] ${batch.batchId}`);url.searchParams.set('body',body);
 const needsPaste=url.href.length>7000;if(needsPaste)url.searchParams.delete('body');
 return {url:url.href,body,needsPaste};
}
export function verifyIssue(issue,batch){
 if(issue.pull_request||typeof issue.body!=='string')return false;
 const block=issue.body.match(/```json\s*([\s\S]*?)\s*```/);
 try {const data=JSON.parse(block?.[1]||'');return data.batchId===batch.batchId&&JSON.stringify(data)===JSON.stringify(batch);}catch{return false;}
}

export function prepareBatch(comments,id){
 const batch=makeBatch([],id);
 for(const comment of comments){const next=makeBatch([...batch.comments,comment],id,batch.createdAt);if(issueBody(next).length>55000&&batch.comments.length)break;batch.comments=next.comments;}
 return batch;
}
