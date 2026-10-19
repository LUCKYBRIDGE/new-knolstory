import {isStageComposition,type StoryProject,type StageActorEntry,type StageComposition} from '@knolstory/story-domain';
import {makeTable,readTable,WorkbookIssue,workbookRow,workbookSheet,type Column,type TableSpec,type AuthoringTables,type WorkbookScalar} from './model';
export type Row=Record<string,WorkbookScalar>;
export const col=(key:string,label:string,type:Column['type']='text',optional=false):Column=>({key,label,type,optional});
export const ownerColumns=[col('chapterId','장 ID'),col('lineId','컷 ID')];
export function issue(spec:TableSpec,message:string,row=0,column='연결'):never{throw new WorkbookIssue(spec.title,row,column,message);}
export function clean(row:Row,keys:readonly string[]):Record<string,WorkbookScalar>{return Object.fromEntries(keys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));}
export function checkLine(row:Row,project:StoryProject,spec:TableSpec){const line=project.lines.find(l=>l.id===row.lineId&&l.chapterId===row.chapterId);if(!line)throw new WorkbookIssue(workbookSheet(row,spec.title),workbookRow(row),'장·컷 연결','존재하지 않는 장·컷 연결입니다.');return line;}
export function checkOrders(rows:Row[],spec:TableSpec){const seen=new Set<number>();for(const row of rows){const order=row.order as number;if(!Number.isInteger(order)||order<0||seen.has(order))issue(spec,'순서는 0 이상의 서로 다른 정수여야 합니다.',0,'순서');seen.add(order);}return [...rows].sort((a,b)=>(a.order as number)-(b.order as number));}
const stage:TableSpec={key:'stages',title:'인물 배치',columns:[...ownerColumns,col('present','인물 배치 있음','boolean'),col('speakerKeysPresent','복수 말하는 인물 목록 있음','boolean'),col('speakerActorKey','대표 말하는 인물 키','text',true)]};
const actorKeys=['key','assetId','characterKey','position','positionOrder','placementPreset','xAnchor','scaleMultiplier','facing','baseDepth','depthOverride'] as const;
const actors:TableSpec={key:'stageActors',title:'배치한 인물',columns:[...ownerColumns,col('side','좌우 그룹'),col('order','그룹 내 순서','number'),...actorKeys.map(k=>col(k,({key:'인물 키',assetId:'그림 자료 ID',characterKey:'등장인물 ID',position:'위치',positionOrder:'위치 순서',placementPreset:'배치 추천 설정',xAnchor:'가로 위치',scaleMultiplier:'크기 배율',facing:'방향',baseDepth:'기본 깊이',depthOverride:'지정 깊이'} as const)[k],['positionOrder','xAnchor','scaleMultiplier','baseDepth','depthOverride'].includes(k)?'number':'text',!['key','assetId'].includes(k))),col('motionPresent','동작 있음','boolean'),col('motionType','동작 종류','text',true),col('durationMs','동작 시간 (초)','number',true),col('delayMs','동작 지연 (초)','number',true),col('fromXAnchor','출발 가로 위치','number',true)]};
const speakers:TableSpec={key:'stageSpeakers',title:'말하는 인물',columns:[...ownerColumns,col('order','말하는 인물 순서','number'),col('actorKey','인물 키')]};
export const STAGE_SPECS=[stage,actors,speakers];
export function exportStageTables(project:StoryProject):AuthoringTables{
 const actorRows:Row[]=[],speakerRows:Row[]=[];
 const scopes=project.lines.map(l=>{const s=l.stageComposition,owner={chapterId:l.chapterId,lineId:l.id};for(const side of ['left','right'] as const)s?.[side==='left'?'leftActors':'rightActors'].forEach((a,order)=>actorRows.push({...owner,side,order,...Object.fromEntries(actorKeys.map(k=>[k,a[k]])),motionPresent:a.motion!==undefined,motionType:a.motion?.type,durationMs:a.motion?.durationMs,delayMs:a.motion?.delayMs,fromXAnchor:a.motion?.fromXAnchor}));s?.speakerActorKeys?.forEach((actorKey,order)=>speakerRows.push({...owner,order,actorKey}));return {...owner,present:s!==undefined,speakerKeysPresent:s?.speakerActorKeys!==undefined,speakerActorKey:s?.speakerActorKey};});
 return {[stage.key]:makeTable(stage,scopes),[actors.key]:makeTable(actors,actorRows),[speakers.key]:makeTable(speakers,speakerRows)};
}
export function readStageTables(tables:AuthoringTables,project:StoryProject):StoryProject{
 const scopes=readTable(tables,stage),actorRows=readTable(tables,actors),speakerRows=readTable(tables,speakers),seen=new Set<string>();
 for(const row of [...scopes,...actorRows,...speakerRows])checkLine(row,project,stage);
 for(const row of scopes){if(seen.has(row.lineId as string))issue(stage,'컷별 구성 행이 중복되었습니다.');seen.add(row.lineId as string);}
 if(seen.size!==project.lines.length)issue(stage,'모든 컷의 구성 행이 필요합니다. 구성 없음은 FALSE로 지정해 주세요.');
 return {...project,lines:project.lines.map(l=>{const row=scopes.find(r=>r.lineId===l.id)!;const ar=actorRows.filter(r=>r.lineId===l.id),sr=speakerRows.filter(r=>r.lineId===l.id);const {stageComposition:_old,...rest}=l;
  if(!row.present){if(ar.length||sr.length||row.speakerKeysPresent||row.speakerActorKey!==undefined)issue(stage,'구성 없음과 인물·말하는 인물 작성 내용이 충돌합니다.');return rest;}
  if(!row.speakerKeysPresent&&sr.length)issue(speakers,'말하는 인물 목록 없음과 작성 내용이 충돌합니다.');
  if(ar.some(r=>r.side!=='left'&&r.side!=='right'))issue(actors,'좌우 그룹은 left 또는 right입니다.');
  const side=(name:string)=>checkOrders(ar.filter(r=>r.side===name),actors).map(r=>{const motion=clean(r,['durationMs','delayMs','fromXAnchor']);if(!r.motionPresent&&(r.motionType!==undefined||Object.keys(motion).length))issue(actors,'동작 없음과 동작 설정이 충돌합니다.');return {...clean(r,actorKeys),...(r.motionPresent?{motion:{type:r.motionType,...motion}}:{})} as StageActorEntry;});
  const composition={leftActors:side('left'),rightActors:side('right'),...(row.speakerKeysPresent?{speakerActorKeys:checkOrders(sr,speakers).map(r=>r.actorKey as string)}:{}),...clean(row,['speakerActorKey'])} as StageComposition;
  if(!isStageComposition(composition))issue(stage,'인물 수·중복 키·말하는 인물 참조·배치·동작 값을 확인해 주세요.',scopes.indexOf(row)+3);return {...rest,stageComposition:composition};})};
}
