import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {defaultEditorPreferences,normalizeEditorPreferences,readEditorPreferences,writeEditorPreferences,editorPreferencesKey,createEditorPreferencesStore,useEditorPreferences} from './editor-preferences';
const store=()=>{const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};};
describe('session-only editor preferences',()=>{
 it('restores the cut arrangement independently for each work without changing old preferences',()=>{
  const storage=store();
  for(const arrangement of ['auto','columns','stacked'] as const){
   const value=normalizeEditorPreferences({screen:'text',arrangement});
   expect(value.arrangement).toBe(arrangement);
   expect(writeEditorPreferences(storage,'a',value)).toBe(true);
   expect(readEditorPreferences(storage,'a').arrangement).toBe(arrangement);
   expect(readEditorPreferences(storage,'b').arrangement).toBe('auto');
  }
  expect(normalizeEditorPreferences({arrangement:'invalid'}).arrangement).toBe('auto');
  expect(normalizeEditorPreferences({screen:'background'}).arrangement).toBe('auto');
 });
 it('starts with basic editing and every optional editor closed',()=>{expect(readEditorPreferences(store(),'a')).toEqual(defaultEditorPreferences);});
 it('round trips separate project settings without authored content',()=>{const storage=store();const value=normalizeEditorPreferences({screen:'audio',enabled:{audio:true},logic:{scores:true},companions:{audio:['text','background']}});writeEditorPreferences(storage,'a',value);expect(readEditorPreferences(storage,'a')).toEqual(value);expect(readEditorPreferences(storage,'b')).toEqual(defaultEditorPreferences);expect(JSON.parse(storage.getItem(editorPreferencesKey('a'))!)).toEqual({version:1,...value});});
 it('requires exact boolean opt-ins and falls back from a closed screen',()=>{expect(normalizeEditorPreferences({screen:'audio',enabled:{audio:'true',characters:1},logic:{scores:'true'}})).toEqual(defaultEditorPreferences);expect(normalizeEditorPreferences({screen:'direction',enabled:{direction:true}}).screen).toBe('direction');});
 it('keeps valid companions per screen, removing unknown, duplicate and primary fields',()=>{expect(normalizeEditorPreferences({screen:'text',companions:{text:['background','background','text','bad','audio'],background:['text'],basic:['text']}}).companions).toEqual({text:['background','audio'],background:['text']});});
 it('rejects corrupt and unsupported storage without affecting edits',()=>{const storage=store();for(const raw of ['{','null','[]','{"version":2,"screen":"text"}','{"version":1,"screen":"bogus"}']){storage.setItem(editorPreferencesKey('a'),raw);expect(readEditorPreferences(storage,'a')).toEqual(defaultEditorPreferences);}expect(readEditorPreferences({getItem:()=>{throw Error('blocked');}},'a')).toEqual(defaultEditorPreferences);expect(writeEditorPreferences({setItem:()=>{throw Error('quota');}},'a',defaultEditorPreferences)).toBe(false);});
 it('does not mutate input or retain arbitrary manuscript fields',()=>{const input={screen:'text',text:'private manuscript',logic:{branches:true},companions:{text:['background']}};const before=JSON.stringify(input);const value=normalizeEditorPreferences(input);expect(JSON.stringify(input)).toBe(before);expect(value).not.toHaveProperty('text');expect(normalizeEditorPreferences(null)).toEqual(defaultEditorPreferences);expect(normalizeEditorPreferences({enabled:[],logic:null,companions:'bad'})).toEqual(defaultEditorPreferences);});
 it('encodes project identifiers as distinct namespace keys',()=>{expect(editorPreferencesKey('a/b')).not.toBe(editorPreferencesKey('a%2Fb'));expect(editorPreferencesKey('__proto__')).toMatch(/^knolstory-editor-session-v1:/);});
 it('restores stable snapshots on a fresh session store and notifies only subscribers',()=>{
  const storage=store(),first=createEditorPreferencesStore(()=>storage);
  let notifications=0;const unsubscribe=first.subscribe(()=>{notifications+=1;});
  first.update('a',current=>({...current,screen:'text',logic:{...current.logic,choices:true}}));
  expect(notifications).toBe(1);unsubscribe();
  first.update('a',current=>({...current,companions:{text:['background']}}));
  expect(notifications).toBe(1);expect(first.snapshot('a')).toBe(first.snapshot('a'));
  const restored=createEditorPreferencesStore(()=>storage);
  expect(restored.snapshot('a')).toEqual(first.snapshot('a'));expect(restored.snapshot('b')).toEqual(defaultEditorPreferences);
 });
 it('keeps settings usable in memory when storage getter or writer fails',()=>{
  for(const storage of [()=>{throw Error('denied');},()=>({getItem:()=>null,setItem:()=>{throw Error('quota');}})]){
   const state=createEditorPreferencesStore(storage);expect(state.snapshot('a')).toEqual(defaultEditorPreferences);
   state.update('a',current=>({...current,screen:'background'}));expect(state.snapshot('a').screen).toBe('background');expect(state.snapshot('b').screen).toBe('basic');
  }
 });

 it('renders a safe hydration baseline without accessing browser storage on the server',()=>{
  function ServerProbe(){const [preferences]=useEditorPreferences('server-work');return createElement('span',null,preferences.screen);}
  expect(renderToString(createElement(ServerProbe))).toBe('<span>basic</span>');
 });

});


describe('effect placement assistance preferences',()=>{
 it('defaults existing works to visible guides and snapping and requires strict boolean values',()=>{
  expect(defaultEditorPreferences.effectAssistance).toEqual({showGuides:true,snap:true});
  for(const effectAssistance of [undefined,null,[],{showGuides:'false',snap:0},{}]){
   expect(normalizeEditorPreferences({effectAssistance}).effectAssistance).toEqual({showGuides:true,snap:true});
  }
  expect(normalizeEditorPreferences({effectAssistance:{showGuides:false}}).effectAssistance).toEqual({showGuides:false,snap:true});
  expect(normalizeEditorPreferences({effectAssistance:{snap:false}}).effectAssistance).toEqual({showGuides:true,snap:false});
 });
 it('persists disabled helpers through serialization and a fresh store without changing unrelated settings',()=>{
  const storage=store(),first=createEditorPreferencesStore(()=>storage);
  first.update('mine',()=>normalizeEditorPreferences({screen:'direction',arrangement:'stacked',enabled:{characters:true,direction:true},logic:{branches:true},companions:{direction:['text','background']}}));
  const before=first.snapshot('mine');
  first.update('mine',current=>({...current,effectAssistance:{showGuides:false,snap:false}}));
  const expected={...before,effectAssistance:{showGuides:false,snap:false}};
  expect(first.snapshot('mine')).toEqual(expected);
  expect(before.effectAssistance).toEqual({showGuides:true,snap:true});
  expect(JSON.parse(storage.getItem(editorPreferencesKey('mine'))!)).toEqual({version:1,...expected});
  const restored=createEditorPreferencesStore(()=>storage);
  expect(restored.snapshot('mine')).toEqual(expected);
  expect(restored.snapshot('other').effectAssistance).toEqual({showGuides:true,snap:true});
  restored.update('mine',current=>({...current,screen:'text'}));
  expect(restored.snapshot('mine').effectAssistance).toEqual({showGuides:false,snap:false});
 });
});

describe('combined audio direction opt-in',()=>{
 it('opens only after both editors are enabled and retains settings per work',()=>{
  for(const enabled of [{},{audio:true},{direction:true},{audio:'true',direction:true}])expect(normalizeEditorPreferences({screen:'audio-direction',enabled}).screen).toBe('basic');
  const settings=normalizeEditorPreferences({screen:'audio-direction',enabled:{audio:true,direction:true}});expect(settings.screen).toBe('audio-direction');const storage=store();writeEditorPreferences(storage,'combined',settings);expect(readEditorPreferences(storage,'combined')).toEqual(settings);expect(readEditorPreferences(storage,'other').screen).toBe('basic');
  expect(normalizeEditorPreferences({...settings,enabled:{audio:false,direction:true}}).screen).toBe('basic');
 });
});
