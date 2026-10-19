import {it,expect} from 'vitest';
import {readTable,requireUnique,WorkbookIssue,type TableSpec} from '../src/authoring-workbook/model';
it('reports the actual worksheet row and Korean column name for duplicate IDs even after blank rows',()=>{
 const spec:TableSpec={key:'cuts',title:'컷',columns:[{key:'id',label:'컷 ID',type:'text'}]};
 const rows=readTable({cuts:{headers:['id'],rows:[['cut-1'],[],['cut-1']]}},spec);
 expect(()=>requireUnique(rows,'id',spec.title)).toThrow('컷 · 5행 · 컷 ID');
});
it('structural errors never tell users to find a nonexistent row zero',()=>{
 expect(new WorkbookIssue('무대 구성',0,'연결','컷 ID를 확인하세요.').message).toBe('무대 구성 · 구조 확인 · 연결: 컷 ID를 확인하세요.');
});
