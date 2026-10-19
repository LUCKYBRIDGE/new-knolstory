import {it,expect} from 'vitest';
import {blankAuthoringArchive,exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
it('blank workbook can grow new cuts by explicit editable owner rows without project payload',async()=>{
 const archive=await blankAuthoringArchive('knolstory'),original=await exportAuthoringWorkbook(archive);const tables=structuredClone(original.tables) as Record<string,{headers:string[];rows:string[][]}>;
 for(const key of ['cuts','stages','audio','presentations']){
  const t=tables[key],source=t.rows.find(row=>key!=='audio'||row[t.headers.indexOf('lineId')]==='cut-1')!;
  expect(source,key).toBeDefined();const next=source.map((value,i)=>['id','lineId'].includes(t.headers[i])&&value==='cut-1'?'cut-2':t.headers[i]==='position'?'1':t.headers[i]==='order'?'2':t.headers[i]==='text'?'표에서 추가한 둘째 컷':value);t.rows.push(next);
 }
 const result=await importAuthoringWorkbook({...original,tables});if(result.format!=='knolstory')throw Error('kind');expect(result.document.project.lines).toHaveLength(2);expect(result.document.project.lines[1].text).toBe('표에서 추가한 둘째 컷');
});
