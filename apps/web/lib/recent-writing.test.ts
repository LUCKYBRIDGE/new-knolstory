import {expect,it} from 'vitest';
import {readRecentWriting,rememberWriting} from './recent-writing';
it('offers only the last saved personal cut for this account on this device',()=>{
 const values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 rememberWriting(storage,'a','new:book','cut-2');
 rememberWriting(storage,'a','heungbu','first');
 expect(readRecentWriting(storage,'a')).toEqual({workKey:'new:book',lineId:'cut-2'});
 expect(readRecentWriting(storage,'b')).toBeNull();
 expect(readRecentWriting(storage,null)).toBeNull();
 values.forEach((_v,k)=>values.set(k,'{}'));
 expect(readRecentWriting(storage,'a')).toBeNull();
});
