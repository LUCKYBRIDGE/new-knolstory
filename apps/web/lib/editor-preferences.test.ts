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
