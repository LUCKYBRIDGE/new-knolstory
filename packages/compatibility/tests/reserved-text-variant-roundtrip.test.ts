import {expect,it} from 'vitest';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,decodeAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';

function replaceIds(value:unknown,mapping:ReadonlyMap<string,string>):unknown{
 if(typeof value==='string')return mapping.get(value)??value;
 if(Array.isArray(value))return value.map(item=>replaceIds(item,mapping));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,replaceIds(item,mapping)]));
 return value;
}
for(const reserved of ['⟪미설정⟫','⟪문자열⟫조건별 글의 컷','⟪문자열⟫⟪미설정⟫'])it(`preserves conditional text and sibling cuts with literal reserved ID ${reserved}`,async()=>{
 const base=getRepresentativeStory('rabbit');
 const authored={...base,project:{...base.project,scores:[{id:'trust',name:'신뢰',description:'',initial:0}],lines:base.project.lines.map((line,index)=>index<2?{...line,text:`기본 글 ${index}`,textVariants:[{id:index?'sibling-variant':'⟪미설정⟫',text:`조건이 맞을 때의 글 ${index}\n다음 줄`,condition:{mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:index+2}]}}]}:line)}};
 const input=replaceIds(authored,new Map([[base.project.lines[0].id,reserved]])) as typeof authored;
 const before=structuredClone(input),archive=await createAuthoringArchive({format:'knolstory',document:input});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(input).toEqual(before);
});
