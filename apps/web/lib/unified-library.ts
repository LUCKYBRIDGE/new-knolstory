import type {OnlineDocumentMetadata} from './document-api';
import type {readOnlineShelfBindings} from './online-work-bindings';

export type OnlineShelfStatus=Readonly<{kind:'local'|'linked'|'remote'|'unknown';label:string;record?:OnlineDocumentMetadata}>;
type ShelfProjection=Readonly<{byLocalKey:Record<string,OnlineShelfStatus>;remoteOnly:OnlineDocumentMetadata[]}>;

/** Join only explicit account-scoped record links; titles, project IDs and timestamps are not identities. */
export function projectOnlineShelf(
 works:readonly Readonly<{key:string}>[],
 records:readonly OnlineDocumentMetadata[],
 bindings:ReturnType<typeof readOnlineShelfBindings>,
 format:'knolstory'|'shortstory',
):ShelfProjection{
 const active=new Map(records.filter(record=>record.format===format&&record.deletedAt==null).map(record=>[record.recordId,record]));
 const linkedIds=new Set<string>();
 const byLocalKey=Object.fromEntries(works.map(work=>{
  const state=bindings[work.key],link=state?.binding;
  let status:OnlineShelfStatus;
  if(state?.error||link&&link.format!==format)status={kind:'unknown',label:'온라인 연결 확인 필요'};
  else if(link){
   linkedIds.add(link.recordId);
   const record=active.get(link.recordId);
   status=record?{kind:'linked',label:'온라인에도 있음',record}:{kind:'linked',label:'온라인 연결'};
  }else status={kind:'local',label:'이 기기에 있음'};
  return [work.key,status];
 }));
 return {byLocalKey,remoteOnly:[...active.values()].filter(record=>!linkedIds.has(record.recordId))};
}
