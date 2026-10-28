import {describe,expect,it} from 'vitest';
import {DEFAULT_READER_PREFERENCES,READER_PREFERENCES_KEY,readReaderPreferences,writeReaderPreferences} from './reader-preferences';
describe('reader preferences',()=>{
 it('uses defaults for absent, malformed and unsupported stored values',()=>{
  for(const raw of [null,'{','null','[]','{"version":2,"textScale":1.3,"autoDelaySeconds":4}','{"version":1,"textScale":99,"autoDelaySeconds":4}','{"version":1,"textScale":1.3,"autoDelaySeconds":0}'])expect(readReaderPreferences({getItem:()=>raw})).toEqual(DEFAULT_READER_PREFERENCES);
 });
 it('round trips supported settings using only the dedicated namespace',()=>{
  const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const preferences={version:1 as const,textScale:1.3,autoDelaySeconds:4.5,format:'landscape' as const,tapMode:'halves' as const};writeReaderPreferences(storage,preferences);
  expect([...values.keys()]).toEqual([READER_PREFERENCES_KEY]);expect(readReaderPreferences(storage)).toEqual(preferences);
 });
 it('migrates older preferences without a format to automatic and rejects unsupported formats',()=>{
  expect(readReaderPreferences({getItem:()=>JSON.stringify({version:1,textScale:1.15,autoDelaySeconds:5})})).toEqual({version:1,textScale:1.15,autoDelaySeconds:5,format:'auto',tapMode:'next'});
  for(const format of ['auto','landscape','portrait'])expect(readReaderPreferences({getItem:()=>JSON.stringify({...DEFAULT_READER_PREFERENCES,format})}).format).toBe(format);
  expect(readReaderPreferences({getItem:()=>JSON.stringify({...DEFAULT_READER_PREFERENCES,format:'wide'})})).toEqual(DEFAULT_READER_PREFERENCES);
  expect(()=>writeReaderPreferences({setItem:()=>{throw Error('should not write');}},{...DEFAULT_READER_PREFERENCES,format:'wide'} as never)).toThrow('읽기 설정 값을 확인해 주세요.');
 });
 it('reads retired 4:3 settings as landscape without rewriting or losing other preferences',()=>{
  const original=JSON.stringify({version:1,textScale:1.3,autoDelaySeconds:7.5,format:'classic'});let writes=0;
  const storage={getItem:()=>original,setItem:()=>{writes++;}};
  expect(readReaderPreferences(storage)).toEqual({version:1,textScale:1.3,autoDelaySeconds:7.5,format:'landscape',tapMode:'next'});expect(writes).toBe(0);
  expect(()=>writeReaderPreferences(storage,{...DEFAULT_READER_PREFERENCES,format:'classic'} as never)).toThrow('읽기 설정 값을 확인해 주세요.');expect(writes).toBe(0);
 });
 it('rejects nonfinite or unsupported user settings before writing',()=>{
  let writes=0;for(const change of [{textScale:NaN},{textScale:1.1},{autoDelaySeconds:Infinity},{autoDelaySeconds:31}])expect(()=>writeReaderPreferences({setItem:()=>{writes++;}},{...DEFAULT_READER_PREFERENCES,...change})).toThrow();expect(writes).toBe(0);
 });
 it('defaults old reading controls to tap anywhere while retaining existing preferences without writes',()=>{
  const original=JSON.stringify({version:1,textScale:1.15,autoDelaySeconds:6,format:'portrait'});const storage={getItem:()=>original};
  expect(readReaderPreferences(storage)).toEqual({...DEFAULT_READER_PREFERENCES,textScale:1.15,autoDelaySeconds:6,format:'portrait',tapMode:'next'});
  expect(storage.getItem()).toBe(original);
 });
 it('rejects unknown touch modes and never writes invalid settings',()=>{
  let writes=0;const stored={...DEFAULT_READER_PREFERENCES,tapMode:'swipe'};
  expect(readReaderPreferences({getItem:()=>JSON.stringify(stored)})).toEqual(DEFAULT_READER_PREFERENCES);
  expect(()=>writeReaderPreferences({setItem:()=>{writes++;}},stored as never)).toThrow();expect(writes).toBe(0);
 });
 it('does not suppress storage access failures',()=>{
  expect(()=>readReaderPreferences({getItem:()=>{throw Error('blocked');}})).toThrow('blocked');expect(()=>writeReaderPreferences({setItem:()=>{throw Error('full');}},DEFAULT_READER_PREFERENCES)).toThrow('full');
 });
});
