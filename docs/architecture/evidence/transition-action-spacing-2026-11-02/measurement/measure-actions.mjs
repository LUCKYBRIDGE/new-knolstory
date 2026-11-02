import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {PNG} from 'pngjs';
const root=process.argv[2]??'test-results/transition-action-spacing',output=process.argv[3]??'.cache/transition-action-measurements.json';
const rows=[];
for(const entry of await readdir(root,{withFileTypes:true})){
 if(!entry.isDirectory())continue;
 const path=join(root,entry.name,'confirmation-and-tools.png');let shot;
 try{shot=PNG.sync.read(await readFile(path));}catch(error){if(error.code==='ENOENT')continue;throw error;}
 const groups=[];
 for(let y=Math.floor(shot.height*.5);y<shot.height;y++){
  let count=0,left=shot.width,right=-1;
  for(let x=0;x<shot.width;x++){const i=(y*shot.width+x)*4;if(Math.abs(shot.data[i]-214)<=4&&Math.abs(shot.data[i+1]-234)<=4&&Math.abs(shot.data[i+2]-223)<=4){count++;left=Math.min(left,x);right=Math.max(right,x);}}
  if(count<shot.width*.5)continue;
  const last=groups.at(-1);if(last&&y===last.bottom+1){last.bottom=y;last.left=Math.min(last.left,left);last.right=Math.max(last.right,right);}else groups.push({top:y,bottom:y,left,right});
 }
 const action=groups.sort((a,b)=>(b.bottom-b.top)-(a.bottom-a.top))[0];if(!action)throw Error('No painted confirmation action: '+path);
 rows.push({screenshot:relative(process.cwd(),path),viewport:{width:shot.width,height:shot.height},paintedAction:{x:action.left,y:action.top,width:action.right-action.left+1,height:action.bottom-action.top+1}});
}
if(rows.length!==4)throw Error('Expected four viewport screenshots');
await writeFile(output,JSON.stringify({basis:'Actual screenshot pixels at DPR1; separate native E2E verifies CSS bounds and dispatches real pointer input.',rows},null,2)+'\n');console.log(rows.map(r=>({viewport:r.viewport,height:r.paintedAction.height})));
