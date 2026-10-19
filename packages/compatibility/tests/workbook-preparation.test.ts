import type { AuthoringTables } from '../src/authoring-workbook/model';
const mutable=(t:AuthoringTables)=>structuredClone(t) as Record<string,{headers:string[];rows:string[][]}>;
import { expect, it } from 'vitest';
import { getRepresentativeStory } from '../src/index';
import { exportPreparationTables, readPreparationTables } from '../src/authoring-workbook/preparation';
it('preserves planning and singular/plural memo links and edits fields',()=>{
 const project=getRepresentativeStory('rabbit').project;
 const source={...project,creativeMemos:[{id:'m1',kind:'free' as const,title:'기획',fields:[{id:'f1',label:'질문',value:'한글\n😀',order:1,source:'custom' as const}],order:1,createdAt:'now',updatedAt:'later',linkedChapterId:project.chapters[0].id,linkedChapterIds:[],linkedLineIds:[project.lines[0].id],linkedCharacterNames:[]}]};
 const tables=exportPreparationTables(source); expect(readPreparationTables(tables,project)).toEqual(source);
 const edited=mutable(tables);edited.memoFields.rows[0][edited.memoFields.headers.indexOf('value')]='수정';
 expect(readPreparationTables(edited,project).creativeMemos[0].fields[0].value).toBe('수정');
 expect(source.creativeMemos[0].fields[0].value).toBe('한글\n😀');
});
it('rejects duplicate memo IDs and missing field owners',()=>{
 const p=getRepresentativeStory('rabbit').project,t=exportPreparationTables({...p,creativeMemos:[{id:'m',kind:'free',title:'',fields:[{id:'f',label:'',value:'',order:1,source:'custom'}],order:1,createdAt:'x',updatedAt:'x'}]});
 expect(()=>readPreparationTables({...t,memos:{...t.memos,rows:[...t.memos.rows,...t.memos.rows]}},p)).toThrow();
 const broken=mutable(t);broken.memoFields.rows[0][0]='missing';expect(()=>readPreparationTables(broken,p)).toThrow();
});
it('adds/deletes and reorders memo rows/fields by explicit order without mutating source',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const source={...p,creativeMemos:[{id:'m',kind:'task' as const,title:'완성',fields:[],order:1,createdAt:'x',updatedAt:'x'}]};
 const t=mutable(exportPreparationTables(source));const row=[...t.memos.rows[0]];row[t.memos.headers.indexOf('id')]='new';row[t.memos.headers.indexOf('position')]='1';row[t.memos.headers.indexOf('order')]='2';t.memos.rows.unshift(row);
 expect(readPreparationTables(t,p).creativeMemos.map(m=>m.id)).toEqual(['m','new']);
 t.memos.rows=[];expect(readPreparationTables(t,p).creativeMemos).toEqual([]);
 expect(source.creativeMemos).toHaveLength(1);
});
it('preserves absence separately from empty memo arrays and keeps unresolved references',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const source={...p,creativeMemos:[{id:'m',kind:'free' as const,title:'',fields:[],order:1,createdAt:'x',updatedAt:'x'}]};
 const t=exportPreparationTables(source);expect(readPreparationTables(t,p)).toStrictEqual(source);
 const edited=mutable(t);edited.memos.rows[0][edited.memos.headers.indexOf('linkedLineId')]='missing';expect(readPreparationTables(edited,p).creativeMemos[0].linkedLineId).toBe('missing');
});
