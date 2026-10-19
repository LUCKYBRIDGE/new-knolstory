export const ACCOUNT_RETURN_KEY='knolstory-account-return-v1';
type ReturnStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type AccountReturnTarget='library'|'shortstory';
export function rememberAccountReturn(storage:ReturnStorage,now=Date.now(),target:AccountReturnTarget='library'){
 if(!['library','shortstory'].includes(target))throw Error('Invalid account return destination.');
 storage.setItem(ACCOUNT_RETURN_KEY,JSON.stringify({version:1,createdAt:now,target}));
}
export function consumeAccountReturnDestination(storage:ReturnStorage,search:string,now=Date.now()):AccountReturnTarget|null{
 const values=new URLSearchParams(search).getAll('auth');
 if(values.length!==1||!['success','linked','error'].includes(values[0]!))return null;
 const raw=storage.getItem(ACCOUNT_RETURN_KEY);storage.removeItem(ACCOUNT_RETURN_KEY);
 try{const value=JSON.parse(raw??'null');if(value?.version!==1||!Number.isSafeInteger(value.createdAt)||value.createdAt>now||now-value.createdAt>30*60*1000)return null;const target=value.target??'library';return target==='library'||target==='shortstory'?target:null;}catch{return null;}
}
export function consumeAccountReturn(storage:ReturnStorage,search:string,now=Date.now()):boolean{
 return consumeAccountReturnDestination(storage,search,now)==='library';
}
export function accountCallbackNotice(search:string){
 const query=new URLSearchParams(search),values=query.getAll('auth');if(values.length!==1)return '';
 if(values[0]==='success')return '로그인 요청 뒤 돌아왔어요. 현재 로그인 상태를 확인해 주세요.';
 if(values[0]==='linked')return 'Google 계정 연결 요청 뒤 돌아왔어요. 현재 로그인 상태를 확인해 주세요.';
 if(values[0]!=='error')return '';
 if(query.get('reason')==='GOOGLE_NOT_LINKED')return '먼저 카카오로 로그인한 뒤 Google 계정을 연결해 주세요.';
 if(query.get('reason')==='IDENTITY_ALREADY_LINKED')return '이 Google 계정은 다른 놀스토리 계정에 연결되어 있어요.';
 return '로그인을 마치지 못했어요. 기존 작품은 그대로이며 다시 시도할 수 있어요.';
}
