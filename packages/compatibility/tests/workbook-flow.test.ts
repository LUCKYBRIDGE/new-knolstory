import {expect,it} from 'vitest';
import {getRepresentativeStory} from '../src/index';
import {exportFlowTables,readFlowTables} from '../src/authoring-workbook/flow';
it('preserves implicit next, pending, null ending, choice order and ending metadata',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const source={...p,lines:p.lines.map((l,i)=>({...l,flow:i===0?{type:'choice' as const,options:[{id:'a',label:'끝',targetLineId:null},{id:'b',label:'작성 중',targetLineId:''}]}:i===1?{type:'goto' as const,targetLineId:null}:undefined,ending:i===2?{name:'끝',description:'한글\n😀',endsStory:false}:undefined}))};
 const t=exportFlowTables(source);expect(readFlowTables(t,{...source,lines:source.lines.map(({flow:_f,ending:_e,...l})=>l)})).toEqual(source);
 const edited=structuredClone(t) as Record<string,{headers:string[];rows:string[][]}>;edited.flowChoices.rows[0][edited.flowChoices.headers.indexOf('label')]='수정';expect(readFlowTables(edited,p).lines[0].flow).toMatchObject({options:[{label:'수정'},{label:'작성 중'}]});
});
it('rejects dangling targets, duplicate choice IDs and stray option owners',()=>{
 const p=getRepresentativeStory('rabbit').project,source={...p,lines:p.lines.map((l,i)=>({...l,flow:i===0?{type:'goto' as const,targetLineId:'missing'}:undefined}))};expect(()=>readFlowTables(exportFlowTables(source),p)).toThrow(/컷/);
});
it('rejects duplicate choice IDs and options without a choice flow atomically',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const source={...p,lines:p.lines.map((l,i)=>({...l,flow:i===0?{type:'choice' as const,options:[{id:'a',label:'첫째',targetLineId:p.lines[1].id},{id:'b',label:'둘째',targetLineId:null}]}:undefined}))};
 const t=structuredClone(exportFlowTables(source)) as Record<string,{headers:string[];rows:string[][]}>;
 const original=structuredClone(p);t.flowChoices.rows[1][t.flowChoices.headers.indexOf('id')]='a';expect(()=>readFlowTables(t,p)).toThrow(/중복/);expect(p).toEqual(original);
 t.flowChoices.rows[1][t.flowChoices.headers.indexOf('id')]='b';t.flows.rows=[];expect(()=>readFlowTables(t,p)).toThrow(/선택/);
});
it('uses explicit position after row and header reordering and permits deliberate flow removal',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const source={...p,lines:p.lines.map((l,i)=>({...l,flow:i===0?{type:'choice' as const,options:[{id:'a',label:'첫째',targetLineId:p.lines[1].id},{id:'b',label:'둘째',targetLineId:null}]}:undefined}))};
 const t=exportFlowTables(source);
 const reordered=Object.fromEntries(Object.entries(t).map(([k,v])=>[k,{headers:[...v.headers].reverse(),rows:[...v.rows].reverse().map(row=>[...row].reverse())}]));expect(readFlowTables(reordered,p).lines[0].flow).toEqual(source.lines[0].flow);
 const empty=exportFlowTables({...p,lines:p.lines.map(({flow:_f,ending:_e,...l})=>l)});expect(readFlowTables(empty,source).lines[0].flow).toBeUndefined();
});
