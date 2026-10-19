import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export function canonicalDocs(root){
 const files=['AGENTS.md','STATUS.md','README.md','DESIGN.md','docs/architecture/development-blueprint.md','docs/architecture/knolstory-final-architecture.md','docs/architecture/documentation-governance.md','docs/architecture/authoring-workbook-v2.md','docs/architecture/authoring-storage-contract.md','docs/architecture/authoring-format-development-plan.md','docs/architecture/authoring-format-completion-audit.md','docs/architecture/score-narrative-contract.md','docs/architecture/score-narrative-development-plan.md','docs/architecture/score-narrative-validation.md','docs/architecture/editor-terminology-and-time.md','docs/architecture/audio-inventory.md','docs/architecture/audio-attributes-and-import.md','docs/architecture/reproducible-test-environment.md','docs/migration/compatibility-matrix.md'];
 for(const folder of ['docs/decisions','.agents/skills']){
  const path=join(root,folder);if(!existsSync(path))continue;
  for(const entry of readdirSync(path,{withFileTypes:true})){
   if(entry.isFile()&&entry.name.endsWith('.md'))files.push(`${folder}/${entry.name}`);
   if(entry.isDirectory()&&existsSync(join(path,entry.name,'SKILL.md')))files.push(`${folder}/${entry.name}/SKILL.md`);
  }
 }
 return files;
}
/** Checks inline local Markdown targets only; does not certify content, anchors or remote state. */
export function checkMarkdownLinks(root,files){
 const errors=[];
 for(const file of files){
  const path=resolve(root,file);if(!existsSync(path)){errors.push({path:file,line:1,target:file,message:'Canonical document missing'});continue;}
  let fenced=false;
  for(const [index,line]of readFileSync(path,'utf8').split('\n').entries()){
   if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;continue;}if(fenced)continue;
   for(const match of line.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)){
    const target=match[1].replace(/^<|>$/g,'');if(target.startsWith('#')||/^[a-z][a-z\d+.-]*:/i.test(target))continue;
    let local;try{local=decodeURIComponent(target.split('#')[0]);}catch{errors.push({path:file,line:index+1,target,message:'Invalid target encoding'});continue;}
    if(local&&!existsSync(resolve(dirname(path),local)))errors.push({path:file,line:index+1,target,message:'Local target missing'});
   }
  }
 }
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const files=canonicalDocs(root);const errors=checkMarkdownLinks(root,files);
 for(const error of errors)process.stderr.write(`${error.path}:${error.line} ${error.message}: ${error.target}\n`);
 process.stdout.write(`Project docs: ${files.length} active documents checked; ${errors.length} link errors. Historical evidence excluded.\n`);
 process.exitCode=errors.length?1:0;
}
