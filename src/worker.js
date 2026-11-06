import { createExtractorFromData } from 'node-unrar-js/esm/index.esm.js';
import wasmBinary from 'node-unrar-js/esm/js/unrar.wasm';
import { parseRsl } from './rsl.js';
let extractor,files=[];
const send=(type,data)=>self.postMessage({type,...data});
const progress=message=>send('progress',{message});
self.onmessage=async({data})=>{
 try{
  if(data.type==='open'){
   extractor=null;files=[];const file=data.file;
   if(!file.size||file.size>256*1024*1024)throw new Error('Choose a non-empty .rar or .rsl file smaller than 256 MB.');
   progress('Reading file on your device…');const bytes=await file.arrayBuffer();
   if(new Uint8Array(bytes,0,Math.min(4,bytes.byteLength)).join(',')==='82,83,79,76'){
    send('solution',{solution:await parseRsl(new Uint8Array(bytes),file.name,progress)});return;
   }
   if(![82,97,114,33,26,7].every((b,i)=>new Uint8Array(bytes)[i]===b))throw new Error('Choose the .rar archive or an extracted .rsl solution. Installers (.exe), ZIPs and screenshots cannot be imported.');
   progress('Opening RAR archive…');extractor=await createExtractorFromData({data:bytes,wasmBinary});
   const listing=extractor.getFileList(),all=[...listing.fileHeaders];
   if(listing.arcHeader.flags.volume||listing.arcHeader.flags.headerEncrypted)throw new Error('Multipart and password-protected archives are not supported.');
   if(all.length>1000||all.reduce((s,f)=>s+f.unpSize,0)>512*1024*1024)throw new Error('Archive expands beyond the preview limit (512 MB / 1,000 entries). Extract a single .rsl and try that instead.');
   files=all.filter(f=>!f.flags.directory&&/\.rsl$/i.test(f.name));
   if(!files.length)throw new Error('No .rsl solutions found inside this archive.');
   if(files.some(f=>f.flags.encrypted||f.unpSize>256*1024*1024))throw new Error('Archive contains a password-protected or oversized solution.');
   send('archive',{files:files.map((f,index)=>({index,name:f.name,size:f.unpSize}))});
  }else if(data.type==='select'){
   const file=files[data.index];if(!extractor||!file)throw new Error('Choose the archive again.');
   progress('Extracting selected solution…');let raw;
   // Exhaust the generator so the native archive handle is released.
   for(const item of extractor.extract({files:[file.name]}).files)if(item.fileHeader.name===file.name)raw=item.extraction;
   if(!raw)throw new Error('The archive did not contain the selected solution.');
   send('solution',{solution:await parseRsl(raw,file.name,progress)});
  }
 }catch(error){send('error',{message:error.message||'Unable to read this file.'});}
};
