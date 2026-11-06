import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const fingerprint=async path=>createHash('sha256').update(await readFile(path)).digest('hex').slice(0,16);
await build({entryPoints:['src/worker.js'],bundle:true,format:'iife',platform:'browser',outfile:'dist/import-worker.js',loader:{'.wasm':'binary'},minify:true});
const workerUrl=`./import-worker.js?v=${await fingerprint('dist/import-worker.js')}`;
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/app.js',minify:true,define:{__NODEWAY_WORKER_URL__:JSON.stringify(workerUrl)}});
// Give changed assets new URLs so cached scripts cannot run against a newer page.
const html=(await readFile('dist/index.html','utf8'))
 .replace(/href="viewer\.css(?:\?[^"\s]*)?"/,`href="viewer.css?v=${await fingerprint('dist/viewer.css')}"`)
 .replace(/src="app\.js(?:\?[^"\s]*)?"/,`src="app.js?v=${await fingerprint('dist/app.js')}"`);
await writeFile('dist/index.html',html);
await build({entryPoints:['src/concepts-feedback.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/concepts-feedback.js',minify:true});
await build({entryPoints:['src/email-result.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/email-result.js',minify:true});
for(const page of ['dist/index.html','dist/concepts.html','dist/email-result.html']){
 let content=await readFile(page,'utf8');
 if(!content.includes('href="feedback.css'))content=content.replace('</head>','<link rel="stylesheet" href="feedback.css"></head>');
 content=content.replace(/href="feedback\.css(?:\?[^"\s]*)?"/,`href="feedback.css?v=${await fingerprint('dist/feedback.css')}"`);
 content=content.replace(/src="concepts-feedback\.js(?:\?[^"\s]*)?"/,`src="concepts-feedback.js?v=${await fingerprint('dist/concepts-feedback.js')}"`);
 content=content.replace(/src="email-result\.js(?:\?[^"\s]*)?"/,`src="email-result.js?v=${await fingerprint('dist/email-result.js')}"`);
 await writeFile(page,content);
}
const licenses=await Promise.all(['node_modules/fzstd/LICENSE','node_modules/node-unrar-js/LICENSE.md'].map(p=>readFile(p,'utf8')));
await writeFile('dist/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n-----------------------\n\n'));
