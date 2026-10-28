import {it,expect,beforeAll} from 'vitest';
import {writeFileSync,readFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {createAuthoringArchive,type AuthoringArchiveInput} from '../src/authoring-archive';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {officeStoryDocument} from './fixtures/office-authoring';
import {completeStoryDocument,completeAudioResources,completeShortStoryProject} from './fixtures/authoring-complete';
const executable=process.env.KNOLSTORY_SOFFICE??'soffice';
mkdirSync('.cache',{recursive:true});const folder=mkdtempSync('.cache/office-roundtrip-');
const cases:{name:string;input:AuthoringArchiveInput}[]=[
 {name:'story-current',input:{format:'knolstory',document:officeStoryDocument()}},
 {name:'story-full',input:{format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()}},
 {name:'shortstory-full',input:{format:'shortstory',project:completeShortStoryProject()}},
];
beforeAll(()=>{
 const version=spawnSync(executable,['--version'],{encoding:'utf8',timeout:30000});
 if(version.status!==0)throw Error('This optional check needs an available soffice executable. Set KNOLSTORY_SOFFICE or add it to PATH.');
 writeFileSync(join(folder,'version.txt'),version.stdout);console.log(`Office evidence: ${folder}`);
});
for(const {name,input} of cases)it(`native LibreOffice XLSX save: ${name}`,{timeout:120000},async()=>{
 const expected=await createAuthoringArchive(input),file=join(folder,`${name}.xlsx`),output=join(folder,'saved');mkdirSync(output,{recursive:true});
 const original=await exportAuthoringExcel(expected);writeFileSync(file,original);writeFileSync(join(folder,`${name}-expected.json`),JSON.stringify(expected,null,2));
 const processResult=spawnSync(executable,['--headless','--convert-to','xlsx','--outdir',output,file],{encoding:'utf8',timeout:90000});
 writeFileSync(join(folder,`${name}-process.json`),JSON.stringify({status:processResult.status,error:processResult.error?.message,stdout:processResult.stdout,stderr:processResult.stderr},null,2));expect(processResult.status).toBe(0);
 const converted=readFileSync(join(output,`${name}.xlsx`)),actual=await importAuthoringExcel(new Uint8Array(converted));
 writeFileSync(join(folder,`${name}-actual.json`),JSON.stringify(actual,null,2));expect(actual).toEqual(expected);
 writeFileSync(join(folder,`${name}-result.json`),JSON.stringify({name,status:'passed',inputBytes:original.length,outputBytes:converted.length,inputSha256:createHash('sha256').update(original).digest('hex'),outputSha256:createHash('sha256').update(converted).digest('hex')},null,2));
});
