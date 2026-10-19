import {it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {scoreNarrativeDocument} from './fixtures/score-narrative';
import {importAuthoringExcel} from '../src/authoring-workbook/excel';
import {createAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
for(const app of ['excel','google']){
 const path=`docs/architecture/evidence/score-narrative/score-${app}-edited.xlsx`;
 it.skipIf(!existsSync(path))(`actual ${app} score definition, choice increment and ending condition edits retain every other authored field`,async()=>{
  const original=scoreNarrativeDocument(),project=original.project;
  const expected=await createAuthoringArchive({format:'knolstory',document:{...original,project:{...project,scores:project.scores!.map((score,i)=>i===0?{...score,description:`${app==='excel'?'Excel':'Google'}에서 정한 신뢰의 뜻 🌳`}:score),lines:project.lines.map((line,i)=>i===0&&line.flow?.type==='choice'?{...line,flow:{...line.flow,options:line.flow.options.map((option,j)=>j===0?{...option,effects:option.effects!.map(effect=>({...effect,value:3}))}:option)}}:i===2&&line.flow?.type==='goto'?{...line,flow:{...line.flow,routes:line.flow.routes!.map((route,j)=>j===0?{...route,condition:{...route.condition,terms:route.condition.terms.map((term,k)=>k===0?{...term,value:5}:term)}}:route)}}:line)}}});
  const result=await importAuthoringExcel(new Uint8Array(readFileSync(path)));expect(result).toEqual(expected);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(result))).toEqual(expected);
 });
}
