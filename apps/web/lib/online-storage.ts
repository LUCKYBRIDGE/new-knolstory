/** Online storage limits shown to people (mirrors server/documents/quota.ts, 2026-11-18).
 * Sizes are upload sizes: the UTF-8 JSON that is sent. Device saving has no such limit. */
const MB=1024*1024;
export const WORK_LIMIT_BYTES=16*MB;
export const LARGE_WORK_BYTES=8*MB;
export const NEAR_LIMIT_BYTES=14*MB;
export type StorageUsage=Readonly<{works:number;worksLimit:number|null;bytes:number;bytesLimit:number|null;workBytesLimit:number;classroom?:Readonly<{bytes:number;limit:number}>}>;

export function formatBytes(bytes:number):string{
 if(!Number.isFinite(bytes)||bytes<=0)return '0KB';
 if(bytes<MB)return `${Math.max(1,Math.round(bytes/1024))}KB`;
 const mb=bytes/MB;
 return `${mb<10?mb.toFixed(1).replace(/\.0$/,''):Math.round(mb)}MB`;
}
export const uploadSize=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;

/** What a work's size means for putting it online. Nothing below the large-work line. */
export function workSizeNotice(bytes:number):Readonly<{level:'info'|'warn'|'block';text:string}>|null{
 const size=`${formatBytes(bytes)} / ${formatBytes(WORK_LIMIT_BYTES)}`;
 if(bytes>WORK_LIMIT_BYTES)return {level:'block',text:`이 작품은 ${formatBytes(bytes)}라서 온라인에 올리거나 제출할 수 없어요. 작품 파일로 저장해 주세요.`};
 if(bytes>NEAR_LIMIT_BYTES)return {level:'warn',text:`곧 온라인에 올릴 수 없는 크기가 돼요 · ${size}. 장면을 나누거나 작품 파일로 저장해 두세요.`};
 if(bytes>LARGE_WORK_BYTES)return {level:'info',text:`큰 작품이에요 · ${size}`};
 return null;
}
/** Throws the same plain sentence the server would answer, before anything is sent. */
export function assertUploadSize(value:unknown):void{
 const notice=workSizeNotice(uploadSize(value));
 if(notice?.level==='block')throw Error(notice.text);
}
const ratio=(used:number,limit:number|null)=>limit?used/limit:0;
/** One line for the library: works and size, with the classroom pool when there is one. */
export function storageSummary(usage:StorageUsage):Readonly<{text:string;warn:boolean;full:boolean}>{
 const parts=[`온라인 ${usage.works}${usage.worksLimit!==null?`/${usage.worksLimit}`:''}개`];
 if(usage.bytesLimit!==null)parts.push(`${formatBytes(usage.bytes)} / ${formatBytes(usage.bytesLimit)}`);
 if(usage.classroom)parts.push(`학급 ${formatBytes(usage.classroom.bytes)} / ${formatBytes(usage.classroom.limit)}`);
 const highest=Math.max(ratio(usage.bytes,usage.bytesLimit),usage.classroom?ratio(usage.classroom.bytes,usage.classroom.limit):0,usage.worksLimit?usage.works/usage.worksLimit:0);
 return {text:parts.join(' · '),warn:highest>=0.8,full:highest>=1};
}
