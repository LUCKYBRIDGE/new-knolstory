import type {StoryBranchCondition,StoryProject} from '@knolstory/story-domain';
import {col,issue,type Row} from './stage';
import {makeTable,readTable,UNSET,workbookRow,type TableSpec,type AuthoringTables} from './model';
const ownerKeys=['ownerTable','chapterId','lineId','cueId','channel','ownerOrder'] as const;
const ownerTables=['presentationEffects','audioTracks','audioSounds'] as const;
export const BRANCH_COLUMNS=[col('branchConditionPresent','선택 갈래 조건 있음','boolean'),col('branchSourceLineId','조건 선택 컷 ID','text',true),col('branchChoiceId','조건 선택지 ID','text',true),col('branchConditionMode','선택 조건 묶음','text',true)];
const termsSpec:TableSpec={key:'branchConditionTerms',title:'선택 조건 묶음',columns:[col('ownerTable','조건을 쓸 곳'),col('chapterId','장 ID'),col('lineId','컷 ID (장 설정은 미설정)','text',true),col('cueId','효과·효과음·이어 재생 ID','text',true),col('channel','소리 종류','text',true),col('ownerOrder','효과 순서','number',true),col('position','조건 순서','number'),col('sourceLineId','선택 컷 ID'),col('choiceId','선택지 ID')]};
export const BRANCH_SPECS=[termsSpec];
function owner(row:Row,table:string):Row{return {ownerTable:table,chapterId:row.chapterId,lineId:row.lineId,cueId:table==='audioTracks'?row.sequenceId:row.id,channel:table==='audioTracks'?row.channel:undefined,ownerOrder:table==='presentationEffects'?row.order:undefined};}
function same(a:Row,b:Row){return ownerKeys.every(k=>a[k]===b[k]);}
export function branchRow(condition:StoryBranchCondition|undefined):Row{return {branchConditionPresent:condition!==undefined,branchSourceLineId:condition&&'sourceLineId' in condition?condition.sourceLineId:undefined,branchChoiceId:condition&&'choiceId' in condition?condition.choiceId:undefined,branchConditionMode:condition&&'terms' in condition?condition.mode:undefined};}
export function readBranch(row:Row,spec:TableSpec,tables:AuthoringTables):{branchCondition?:StoryBranchCondition}{
 const children=(tables[termsSpec.key]?readTable(tables,termsSpec):[]).filter(term=>same(term,owner(row,spec.key)));
 if(!row.branchConditionPresent){if(row.branchSourceLineId!==undefined||row.branchChoiceId!==undefined||row.branchConditionMode!==undefined||children.length)issue(spec,'선택 갈래 조건 없음과 조건 값이 충돌합니다.',workbookRow(row),'선택 갈래 조건');return {};}
 if(row.branchConditionMode!==undefined){if(!['all','any'].includes(String(row.branchConditionMode))||row.branchSourceLineId!==undefined||row.branchChoiceId!==undefined)issue(spec,'조건 묶음과 단일 선택 ID를 함께 쓰지 마세요.');const ordered=[...children].sort((a,b)=>Number(a.position)-Number(b.position));if(ordered.length<1||ordered.length>8||ordered.some((term,index)=>term.position!==index)||new Set(ordered.map(t=>JSON.stringify([t.sourceLineId,t.choiceId]))).size!==ordered.length)issue(termsSpec,'조건은 1~8개, 순서는 0부터 연속으로 중복 없이 써 주세요.');return {branchCondition:{mode:row.branchConditionMode,terms:ordered.map(term=>({sourceLineId:term.sourceLineId,choiceId:term.choiceId}))} as StoryBranchCondition};}
 if(children.length)issue(spec,'단일 선택 조건에 묶음 조건 행이 있습니다.');
 if(typeof row.branchSourceLineId!=='string'||!row.branchSourceLineId.trim()||typeof row.branchChoiceId!=='string'||!row.branchChoiceId.trim())issue(spec,'조건 선택 컷 ID와 선택지 ID를 함께 입력해 주세요.',workbookRow(row),'선택 갈래 조건');
 return {branchCondition:{sourceLineId:row.branchSourceLineId,choiceId:row.branchChoiceId}};
}
export function exportBranchTables(project:StoryProject):AuthoringTables{
 const rows:Row[]=[];const append=(condition:StoryBranchCondition|undefined,identity:Row)=>{if(condition&&'terms' in condition)condition.terms.forEach((term,position)=>rows.push({...identity,position,...term}));};
 for(const line of project.lines)line.presentation?.effects?.forEach((cue,order)=>append(cue.branchCondition,owner({chapterId:line.chapterId,lineId:line.id,id:cue.id,order},'presentationEffects')));
 for(const item of [...project.chapters.map(c=>({chapterId:c.id,lineId:undefined,audio:c.audio})),...project.lines.map(l=>({chapterId:l.chapterId,lineId:l.id,audio:l.audio}))]){for(const channel of ['music','ambience'] as const){const cue=item.audio?.[channel];if(cue&&'branchCondition' in cue)append(cue.branchCondition,owner({...item,channel,sequenceId:cue.action==='sequence'?cue.id:undefined} as unknown as Row,'audioTracks'));}for(const cue of item.audio?.sounds??[])append(cue.branchCondition,owner({chapterId:item.chapterId,lineId:item.lineId,id:cue.id},'audioSounds'));}
 return {[termsSpec.key]:makeTable(termsSpec,rows)};
}
/** Workbook8 scalar sheets are adapted only when the complete group extension is absent. */
export function upgradeBranchGroupTables(tables:AuthoringTables):AuthoringTables{
 const markers=ownerTables.map(key=>!!tables[key]?.headers.includes('branchConditionMode')),present=!!tables[termsSpec.key];
 if(present||markers.some(Boolean)){if(!present||!markers.every(Boolean))issue(termsSpec,'조건 묶음 탭과 세 설정 탭의 선택 조건 묶음 열을 함께 유지해 주세요.');return tables;}
 return {...tables,...Object.fromEntries(ownerTables.filter(key=>tables[key]).map(key=>{const table=tables[key];return [key,{headers:[...table.headers,'branchConditionMode'],rows:table.rows.map(row=>[...row,UNSET])}];})),[termsSpec.key]:makeTable(termsSpec,[])};
}
export function validateBranchGroupOwners(tables:AuthoringTables,project:StoryProject):StoryProject{
 // Project only identity columns, then use the same typed cell decoder as every authored table.
 // In particular, a literal unset token is an ID when escaped by makeTable, never an absent value.
 const identities=Object.fromEntries(ownerTables.filter(key=>tables[key]).map(key=>{
  const table=tables[key],headers=table.headers.filter(header=>['chapterId','lineId','id','sequenceId','channel','order'].includes(header));
  const spec:TableSpec={key,title:key,columns:headers.map(header=>col(header,header,header==='order'?'number':'text',header!=='chapterId'&&header!=='order'))};
  return [key,readTable({[key]:{headers,rows:table.rows.map(row=>headers.map(header=>row[table.headers.indexOf(header)]))}},spec)];
 }));
 for(const term of readTable(tables,termsSpec)){
  if(!ownerTables.includes(term.ownerTable as typeof ownerTables[number]))issue(termsSpec,'조건을 쓸 곳이 올바르지 않습니다.');
  const key=String(term.ownerTable),table=tables[key];if(!table)issue(termsSpec,'연결된 설정 탭이 없습니다.');
  const matches=identities[key].filter(row=>same(term,owner(row,key)));
  if(matches.length!==1)issue(termsSpec,'장·컷·효과 순서·효과 ID·소리 종류가 정확히 같은 설정 행에 연결해 주세요.');
 }
 return project;
}
