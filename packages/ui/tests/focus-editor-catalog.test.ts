import {describe,expect,it} from 'vitest';
import {applyMessages,effectiveDevices,focusEditorCatalog,focusScreenBlueprints,readPointer,validateSurface,type A2uiComponent,type A2uiMessage,type Surface} from '../src/index';

const surfaceOf=(messages:A2uiMessage[])=>[...applyMessages(messages).values()][0]!;
const basic=()=>surfaceOf(structuredClone(focusScreenBlueprints.basic));
const edit=(surface:Surface,id:string,patch:Partial<A2uiComponent>)=>surface.components.set(id,{...surface.components.get(id)!,...patch} as A2uiComponent);
const rules=(surface:Surface)=>validateSurface(surface).map(issue=>`${issue.rule}:${issue.id}`);

describe('focus editor A2UI catalog',()=>{
 it('is an A2UI catalog with a component schema per name',()=>{
  expect(focusEditorCatalog.catalogId).toMatch(/^https:\/\//);
  expect(focusEditorCatalog.instructions).toContain('Notice');
  for(const [name,schema] of Object.entries(focusEditorCatalog.components)){
   expect((schema.properties?.component as {const?:string}).const).toBe(name);
   expect(schema.required).toContain('component');
  }
  // Rule 5: there is no free text component, so standing explanations cannot be composed.
  expect(Object.keys(focusEditorCatalog.components)).not.toContain('Text');
 });

 it.each(Object.entries(focusScreenBlueprints))('%s blueprint follows the catalog and the focus rules',(task,messages)=>{
  const surface=surfaceOf(messages);
  expect(validateSurface(surface)).toEqual([]);
  expect(surface.components.get('root')).toMatchObject({component:'FocusScreen',task});
  expect(readPointer(surface.data,'/cut')).toBe(3);
 });

 it('rejects components, props and values outside the catalog',()=>{
  const surface=basic();
  surface.components.set('hint',{id:'hint',component:'Text',text:'여기에 글을 써요'});
  edit(surface,'new-cut',{size:'large'});
  edit(surface,'more',{summary:'가끔 쓰는 도구 더 보기와 정리'});
  surface.components.set('tip',{id:'tip',component:'Notice',kind:'info',text:'도움말'});
  edit(surface,'work',{children:['speaker-tools','cut-tools','tip'],gap:10});
  expect(rules(surface)).toEqual(expect.arrayContaining(['unknown-component:hint','orphan:hint','unknown-prop:new-cut','max-length:more','enum:tip','enum:work']));
 });

 it('keeps one way per job, one primary and four controls per group',()=>{
  const surface=basic();
  surface.components.set('second-map',{id:'second-map',component:'Button',label:'지도',variant:'primary',action:{event:{name:'openMap'}}});
  surface.components.set('a',{id:'a',component:'Button',label:'가',action:{event:{name:'a'}}});
  surface.components.set('b',{id:'b',component:'Button',label:'나',action:{event:{name:'b'}}});
  edit(surface,'cut-tools',{children:['new-cut','second-map','a','b','speaker']});
  expect(rules(surface)).toEqual(expect.arrayContaining(['one-way:second-map','one-primary:second-map','max-items:cut-tools','one-parent:speaker']));
 });

 it('allows the same job twice only when the devices never meet',()=>{
  const surface=basic();
  surface.components.set('phone-map',{id:'phone-map',component:'Button',label:'지도',devices:['phone'],action:{event:{name:'openMap'}}});
  edit(surface,'cut-tools',{children:['new-cut','phone-map']});
  edit(surface,'more',{devices:['tablet','desktop']});
  expect(validateSurface(surface)).toEqual([]);
  expect(effectiveDevices(surface,'story-map')).toEqual(['tablet','desktop']);
 });

 it('keeps cut cards off phones and parents within allowedParents',()=>{
  const surface=basic();
  edit(surface,'previous-card',{devices:['phone','tablet']});
  surface.components.set('nav-in-work',{id:'nav-in-work',component:'CutNavigator',chapter:1,cut:1,previous:{event:{name:'p2'}},next:{event:{name:'n2'}},openList:{event:{name:'l2'}}});
  edit(surface,'work',{children:['speaker-tools','cut-tools','nav-in-work']});
  expect(rules(surface)).toEqual(expect.arrayContaining(['enum:previous-card','allowed-parents:nav-in-work']));
 });

 it('checks the skeleton: root, tabs, children and cycles',()=>{
  const surface=basic();
  edit(surface,'work-tabs',{selected:'audio'});
  edit(surface,'more-tools',{children:['split-story','missing']});
  edit(surface,'more',{children:['more-tools','more']});
  surface.components.delete('root-top');
  expect(rules(surface)).toEqual(expect.arrayContaining(['selected-task:work-tabs','missing-child:more-tools','missing-child:root','orphan:cut-nav','cycle:more']));
  const empty=surfaceOf([{version:'v0.9',createSurface:{surfaceId:'x',catalogId:'other'}}]);
  expect(rules(empty)).toEqual(['catalog:x','root:x']);
 });

 it('validates A2UI common types',()=>{
  const surface=basic();
  edit(surface,'new-cut',{label:3,action:{go:'x'},disabled:{call:'isLast',returnType:'boolean'}});
  edit(surface,'speaker',{value:'나무꾼',options:[{value:'a',label:'가',extra:1}]});
  edit(surface,'more',{children:{componentId:'more-tools'}});
  edit(surface,'root',{context:'previous-card'});
  edit(surface,'work-tabs',{tabs:['basic','basic']});
  expect(rules(surface)).toEqual(expect.arrayContaining(['type:new-cut','type:speaker','min-items:speaker','unknown-prop:speaker','type:more','type:root','unique:work-tabs']));
 });

 it('applies data model updates and deletes surfaces',()=>{
  const messages:A2uiMessage[]=[
   {version:'v0.9',createSurface:{surfaceId:'s',catalogId:focusEditorCatalog.catalogId}},
   {version:'v0.9',updateDataModel:{surfaceId:'s',value:{cut:{text:'a'}}}},
   {version:'v0.9',updateDataModel:{surfaceId:'s',path:'/cut/speaker~1name',value:'b'}},
   {version:'v0.9',updateDataModel:{surfaceId:'s',path:'/cut/text'}},
  ];
  const surfaces=applyMessages(messages);
  expect(surfaces.get('s')!.data).toEqual({cut:{'speaker/name':'b'}});
  expect(readPointer(surfaces.get('s')!.data,'/cut/text/deep')).toBeUndefined();
  applyMessages([{version:'v0.9',updateDataModel:{surfaceId:'s',path:'/'}}],surfaces);
  expect(surfaces.get('s')!.data).toEqual({});
  applyMessages([{version:'v0.9',deleteSurface:{surfaceId:'s'}}],surfaces);
  expect(surfaces.size).toBe(0);
  expect(()=>applyMessages([{version:'v0.9',updateComponents:{surfaceId:'none',components:[]}}])).toThrow('createSurface');
  expect(()=>applyMessages([{version:'v1.0'} as unknown as A2uiMessage])).toThrow('버전');
  expect(()=>readPointer({},'cut')).toThrow('/');
 });
});
