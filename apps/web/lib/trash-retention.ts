/** Online trash keeps a work for 10 days (2026-11-16 owner decision, Q-03); the server then deletes it for good. */
export const TRASH_RETENTION_DAYS=10;
const DAY=24*60*60*1000;

/** Short notice for a trashed work: how long it can still be restored. */
export function trashExpiryNotice(deletedAt:number|null|undefined,now:number):string|null{
 if(typeof deletedAt!=='number')return null;
 const left=deletedAt+TRASH_RETENTION_DAYS*DAY-now;
 if(left<=DAY)return '곧 영구 삭제돼요';
 return `${Math.ceil(left/DAY)}일 뒤 영구 삭제돼요`;
}
