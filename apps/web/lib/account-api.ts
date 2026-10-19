/** Session credentials stay in memory; authored works never enter these requests. */
export type AccountSession=Readonly<{accountId:string;csrf:string}>;
export type AccountConfig=Readonly<{signupProvider:'kakao';providers:Readonly<{kakao:boolean;google:boolean}>}>;
type Fetcher=typeof fetch;
const unavailable=()=>new Error('계정 서비스를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
async function request(path:string,fetcher:Fetcher,options:RequestInit={}){
 const response=await fetcher(path,{credentials:'same-origin',cache:'no-store',redirect:'error',...options});
 if(response.status===401)return null;
 const envelope:unknown=await response.json();
 if(!response.ok||!object(envelope)||envelope.success!==true||!object(envelope.data))throw unavailable();
 return envelope.data;
}
export async function accountSession(fetcher:Fetcher=fetch):Promise<AccountSession|null>{
 const value=await request('/api/v1/me',fetcher);if(value===null)return null;
 if(typeof value.accountId!=='string'||!value.accountId||typeof value.csrf!=='string'||!value.csrf)throw unavailable();
 return {accountId:value.accountId,csrf:value.csrf};
}
export async function accountConfig(fetcher:Fetcher=fetch):Promise<AccountConfig>{
 const value=await request('/api/v1/auth/config',fetcher);
 if(!value||value.signupProvider!=='kakao'||!object(value.providers)||typeof value.providers.kakao!=='boolean'||typeof value.providers.google!=='boolean')throw unavailable();
 return {signupProvider:'kakao',providers:{kakao:value.providers.kakao,google:value.providers.google}};
}
export function checkedAuthorizationUrl(value:unknown):string{
 if(typeof value!=='string')throw unavailable();const url=new URL(value);
 if(url.origin!=='https://accounts.google.com'||url.pathname!=='/o/oauth2/v2/auth'||url.username||url.password||url.hash)throw unavailable();
 return url.href;
}
export async function accountGoogleLink(csrf:string,fetcher:Fetcher=fetch){
 const value=await request('/api/v1/auth/google/link/start',fetcher,{method:'POST',headers:{'x-csrf-token':csrf}});
 if(!value)throw new Error('로그인이 만료됐어요. 카카오로 다시 로그인해 주세요.');
 return checkedAuthorizationUrl(value.authorizationUrl);
}
export async function accountLogout(csrf:string,fetcher:Fetcher=fetch){
 const value=await request('/api/v1/auth/logout',fetcher,{method:'POST',headers:{'x-csrf-token':csrf}});
 if(value!==null&&value.loggedOut!==true)throw unavailable();
}
