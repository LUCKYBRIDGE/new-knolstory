/** A synchronous writer used only while its host holds the origin's Web Lock. */
export function createStorageGuard(storage:Pick<Storage,'getItem'|'setItem'>,key:string){
 let expected=storage.getItem(key);
 let owned=false;
 const assertWritable=()=>{
  if(!owned)throw Error('다른 탭에서 보관함을 사용 중이에요. 현재 작품을 파일로 보관하고 그 탭을 닫은 뒤 새로고침해 주세요.');
  if(storage.getItem(key)!==expected)throw Error('보관함이 다른 탭에서 변경됐어요. 현재 작품을 파일로 보관한 뒤 새로고침해 주세요.');
 };
 return {
  setOwned(value:boolean){owned=value;},
  assertWritable,
  getItem:(name:string)=>storage.getItem(name),
  setItem(name:string,value:string){
   if(name!==key)throw Error('허용되지 않은 저장 키입니다.');
   assertWritable();storage.setItem(name,value);expected=value;
  },
 };
}
