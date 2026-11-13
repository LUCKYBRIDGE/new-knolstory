/** A teacher's hand-in link (e.g. a Google Drive folder): https only, no embedded sign-in. */
export function normalizeShareLink(value:string):string|null{
 const raw=value.trim();if(!raw)return null;
 try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||raw.length>2048)return null;return url.href;}catch{return null;}
}
export function shareLinkHost(value:string){try{return new URL(value).hostname.replace(/^www\./,'');}catch{return '';}}
