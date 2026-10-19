import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const retiredTerms=[['다른 작업파일로 저장','다른 파일로 저장'],['작업파일','작품 파일'],['브라우저에 복구본 보관됨','임시 보관됨'],['브라우저 복구본','임시 보관'],['기기에 저장됨','임시 보관됨'],['전체 그림 보이기','전체 이미지 보기']];
export function isHistoricalDocument(path){return /\/(evidence|archive|decisions|reference)\//.test(path)||/(-validation|-verification|-audit|-evidence|-reference|-spike|mockup|editor-redesign|approved-ui|next-session-goal-2026)/.test(path);}
function currentLines(source,visit,markdown=true){
 let fence=null,history=false;
 return source.split('\n').map((line,index)=>{
  const mark=line.match(/^\s*(`{3,}|~{3,})/);
  if(mark){if(!fence)fence=mark[1][0];else if(fence===mark[1][0])fence=null;return line;}
  if(/^\s*<!-- language-history -->\s*$/.test(line)){history=true;return line;}
  if(/^\s*<!-- \/language-history -->\s*$/.test(line)){history=false;return line;}
  if(fence||history||/^\s*(>|#{1,6}\s)/.test(line)||markdown&&(/^( {4}|\t)/.test(line)||/^\s*\[[^\]]+\]:/.test(line)||/^\s*<a\s+id=["'][^"']+["']><\/a>\s*$/.test(line)))return line;
  // Preserve Markdown destinations and raw URLs, including historical anchor names.
  const protectedParts=markdown?/(`+)[^\n]*?\1|\]\([^\n)]*\)|\]\[[^\]\n]*\]|https?:\/\/[^\s<>]+/g:/\]\([^\n)]*\)|https?:\/\/[^\s<>]+/g;
  let result='',cursor=0;
  for(const match of line.matchAll(protectedParts)){result+=visit(line.slice(cursor,match.index),index+1)+match[0];cursor=match.index+match[0].length;}
  return result+visit(line.slice(cursor),index+1);
 }).join('\n');
}
export function languageIssues(source,markdown=true){
 const issues=[];
 currentLines(source,(line,index)=>{let checked=line;for(const [term,preferred] of retiredTerms){if(checked.includes(term)){issues.push({line:index,term,preferred});checked=checked.replaceAll(term,'');}}return line;},markdown);
 return issues;
}
export function replaceRetiredTerms(source){return currentLines(source,line=>retiredTerms.reduce((text,[term,preferred])=>text.replaceAll(term,preferred),line));}
function walk(root,path){if(!existsSync(resolve(root,path)))return [];return readdirSync(resolve(root,path),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(root,`${path}/${item.name}`):[`${path}/${item.name}`]);}
export function languageSurfaces(root){
 const candidates=['AGENTS.md','README.md','STATUS.md','DESIGN.md',...walk(root,'docs'),...walk(root,'.agents/skills'),...walk(root,'apps/web/components'),...walk(root,'apps/web/app'),...walk(root,'apps/web/lib')];
 const checked=[],historical=[];
 for(const path of candidates){
  if(!/\.(md|tsx|ts)$/.test(path)||path.endsWith('.test.ts'))continue;
  if(isHistoricalDocument(path)){historical.push(path);continue;}
  // This owner must discuss rejected names; other documents link to its definitions.
  if(path==='docs/architecture/editor-terminology-and-time.md'||path==='apps/web/lib/editor-terms.ts')continue;
  checked.push(path);
 }
 return {checked:[...new Set(checked)].sort(),historical:historical.sort()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const {checked,historical}=languageSurfaces(root);
 const issues=checked.flatMap(path=>languageIssues(readFileSync(resolve(root,path),'utf8'),path.endsWith('.md')).map(issue=>({path,...issue})));
 for(const issue of issues)process.stderr.write(`${issue.path}:${issue.line} ${issue.term} -> ${issue.preferred}\n`);
 process.stdout.write(`Product language: ${checked.length} current surfaces, ${historical.length} historical surfaces preserved; ${issues.length} retired-term occurrences. Semantic review remains required.\n`);
 process.exitCode=issues.length?1:0;
}
