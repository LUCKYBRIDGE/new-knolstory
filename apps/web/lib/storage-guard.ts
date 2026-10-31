/** A synchronous writer used only while its host holds the origin's Web Lock.
 * `expected` is the raw value this tab last read or wrote. When the tab takes the writer over from
 * another tab, it adopts whatever that tab saved (`changedSince`) and then `resync`s before writing. */
export function createStorageGuard(storage:Pick<Storage,'getItem'|'setItem'>,key:string){
 let expected=storage.getItem(key);
 let owned=false;
 const assertWritable=()=>{
  if(!owned)throw Error('이 탭에서 저장할 준비를 하고 있어요. 잠시 뒤 다시 해 주세요.');
  if(storage.getItem(key)!==expected)throw Error('다른 탭에서 저장한 내용을 먼저 불러오고 있어요. 잠시 뒤 다시 해 주세요.');
 };
 return {
  setOwned(value:boolean){owned=value;},
  isOwned:()=>owned,
  changedSince:(raw:string|null)=>raw!==expected,
  resync(raw:string|null=storage.getItem(key)){expected=raw;},
  assertWritable,
  getItem:(name:string)=>storage.getItem(name),
  setItem(name:string,value:string){
   if(name!==key)throw Error('허용되지 않은 저장 키입니다.');
   assertWritable();storage.setItem(name,value);expected=value;
  },
 };
}
export type StorageGuard=ReturnType<typeof createStorageGuard>;
