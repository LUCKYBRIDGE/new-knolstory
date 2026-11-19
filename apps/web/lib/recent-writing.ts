// A device-local navigation hint. Never include this pointer in the manuscript or reader saves.
const keyFor=(accountId:string|null)=>'knolstory-recent-writing-v1:'+JSON.stringify(accountId);
const personal=(key:unknown):key is string=>typeof key==='string'&&/^(new|import):.+/.test(key);
export type RecentWriting={workKey:string;lineId:string};

export function readRecentWriting(storage:Pick<Storage,'getItem'>,accountId:string|null):RecentWriting|null{
 try{
  const value=JSON.parse(storage.getItem(keyFor(accountId))??'null');
  return personal(value?.workKey)&&typeof value.lineId==='string'&&value.lineId
   ?{workKey:value.workKey,lineId:value.lineId}:null;
 }catch{return null;}
}
export function rememberWriting(storage:Pick<Storage,'setItem'>,accountId:string|null,workKey:string,lineId:string){
 if(!personal(workKey)||!lineId)return;
 try{storage.setItem(keyFor(accountId),JSON.stringify({workKey,lineId}));}
 catch{/* An unavailable shortcut must not turn a successful manuscript save into a failure. */}
}
