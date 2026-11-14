import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
import {describe,expect,it} from 'vitest';

const web=join(__dirname,'..');
// Print sheets size text in physical units for paper.
const PRINT=new Set(['components/classroom/student-qr-print.module.css']);
const TOKENS=['caption','small','body','lead','title','heading','display'];

function cssFiles(dir:string):string[]{
 return readdirSync(dir).flatMap(name=>{
  const path=join(dir,name);
  if(statSync(path).isDirectory())return name==='node_modules'||name==='.next'||name==='out'?[]:cssFiles(path);
  return name.endsWith('.css')?[path]:[];
 });
}

describe('type scale',()=>{
 it('defines the shared steps once',()=>{
  const globals=readFileSync(join(web,'app/globals.css'),'utf8');
  for(const token of TOKENS)expect(globals).toMatch(new RegExp(`--text-${token}:\\d+px`));
 });
 it('uses the shared steps for every fixed UI font size',()=>{
  const strays:string[]=[];
  for(const path of [...cssFiles(join(web,'components')),...cssFiles(join(web,'app'))]){
   const file=relative(web,path);
   if(PRINT.has(file))continue;
   for(const [,value] of readFileSync(path,'utf8').matchAll(/font-size:\s*([^;}]+)/g)){
    const size=value!.replace('!important','').trim();
    // Fitted titles (clamp/cqw), relative em sizes and fallbacks inside var() scale on purpose.
    if(/^\d*\.?\d+(px|rem)$/.test(size))strays.push(`${file}: ${size}`);
    const used=size.match(/^var\(--text-([a-z]+)\)$/)?.[1];
    if(used&&!TOKENS.includes(used))strays.push(`${file}: ${size}`);
   }
  }
  expect(strays).toEqual([]);
 });
});
