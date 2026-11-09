type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type View=boolean|'library';
const KEY='knolstory-shortstory-account-view-v1';
export function rememberShortStoryAccountView(storage:Store,bookId:string,editing:View,now=Date.now()){
 storage.setItem(KEY,JSON.stringify({version:1,bookId,editing,createdAt:now}));
}
/** Optional one-use UI return state, never authentication or authored content. */
export function consumeShortStoryAccountView(storage:Store,search:string,bookId:string,now=Date.now()):View|null{
 const auth=new URLSearchParams(search).getAll('auth');if(auth.length!==1||!['success','linked','error'].includes(auth[0]!))return null;
 const raw=storage.getItem(KEY);storage.removeItem(KEY);
 try{const value=JSON.parse(raw??'null');return value?.version===1&&value.bookId===bookId&&(typeof value.editing==='boolean'||value.editing==='library')&&Number.isSafeInteger(value.createdAt)&&value.createdAt<=now&&now-value.createdAt<=1800000?value.editing:null;}catch{return null;}
}
