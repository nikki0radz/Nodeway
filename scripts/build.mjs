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
const licenses=await Promise.all(['node_modules/fzstd/LICENSE','node_modules/node-unrar-js/LICENSE.md'].map(p=>readFile(p,'utf8')));
await writeFile('dist/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n-----------------------\n\n'));
