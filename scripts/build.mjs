import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
await build({entryPoints:['src/worker.js'],bundle:true,format:'iife',platform:'browser',outfile:'dist/import-worker.js',loader:{'.wasm':'binary'},minify:true});
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/app.js',minify:true});
const licenses=await Promise.all(['node_modules/fzstd/LICENSE','node_modules/node-unrar-js/LICENSE.md'].map(p=>readFile(p,'utf8')));
await writeFile('dist/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n-----------------------\n\n'));
