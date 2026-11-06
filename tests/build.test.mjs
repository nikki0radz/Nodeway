import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('published page and worker URLs identify the exact built assets',async()=>{
 const hash=data=>createHash('sha256').update(data).digest('hex').slice(0,16);
 const html=await readFile('dist/index.html','utf8');
 const app=await readFile('dist/app.js','utf8');
 const css=await readFile('dist/viewer.css');
 const worker=await readFile('dist/import-worker.js');
 assert.ok(html.includes(`src="app.js?v=${hash(app)}"`));
 assert.ok(html.includes(`href="viewer.css?v=${hash(css)}"`));
 const workerUrl=`./import-worker.js?v=${hash(worker)}`;
 assert.ok(app.includes(workerUrl));
 assert.equal(new URL(workerUrl,'https://nikki0radz.github.io/Nodeway/dist/').pathname,'/Nodeway/dist/import-worker.js');
 assert.equal(new URL(workerUrl,'https://nodeway.nikki0radz.chatgpt.site/').pathname,'/import-worker.js');
});
