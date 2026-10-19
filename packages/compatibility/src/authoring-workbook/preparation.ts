import type { StoryProject, StoryPlanning } from '@knolstory/story-domain';
import type { CreativeMemo } from '../../../story-domain/src/legacy/creative-memos';
import { makeTable,readTable,requireUnique,WorkbookIssue,type AuthoringTables,type TableSpec,type WorkbookScalar } from './model';
const column=(key:string,label:string,type:'text'|'number'|'boolean'='text',optional=false)=>({key,label,type,optional});
const planningLabels={premise:'한 줄 이야기',structureMode:'구조',material:'소재',theme:'주제',mainCharacter:'주인공',mainGoal:'목표',centralProblem:'중심 문제',stakes:'위험',endingChange:'결말의 변화',opening:'시작',middle:'중간',crisis:'위기',climax:'절정',ending:'결말',characterNotes:'인물 메모',worldNotes:'세계 메모',mood:'분위기',openQuestions:'열린 질문',freeNotes:'자유 메모'};
const planning:TableSpec={key:'planning',title:'작품 기획',columns:Object.entries(planningLabels).map(([key,label])=>column(key,label))};
const memos:TableSpec={key:'memos',title:'창작 메모',columns:[column('id','메모 ID'),column('position','배열 순서','number'),column('kind','종류'),column('title','제목'),column('order','표시 순서','number'),column('createdAt','작성일'),column('updatedAt','수정일'),column('linkedChapterId','단일 장 ID','text',true),column('linkedLineId','단일 컷 ID','text',true),...['linkedChapterIds','linkedLineIds','linkedCharacterNames'].map(key=>column(key+'Present',key==='linkedChapterIds'?'장 목록 있음':key==='linkedLineIds'?'컷 목록 있음':'인물 목록 있음','boolean'))]};
const fields:TableSpec={key:'memoFields',title:'메모 항목',columns:[column('memoId','메모 ID'),column('id','항목 ID'),column('position','배열 순서','number'),column('label','항목명'),column('value','내용'),column('order','표시 순서','number'),column('source','출처')]};
const links:TableSpec={key:'memoLinks',title:'메모 연결',columns:[column('memoId','메모 ID'),column('kind','연결 종류'),column('position','배열 순서','number'),column('target','연결 대상')]};
export const PREPARATION_SPECS:TableSpec[]=[planning,memos,fields,links];
const arrays=['linkedChapterIds','linkedLineIds','linkedCharacterNames'] as const;
export function exportPreparationTables(project:StoryProject):AuthoringTables {
 return {[planning.key]:makeTable(planning,[project.planning]),[memos.key]:makeTable(memos,project.creativeMemos.map((m,position)=>({...Object.fromEntries(Object.entries(m).filter(([key])=>!['fields',...arrays].includes(key))),position,...Object.fromEntries(arrays.map(key=>[key+'Present',m[key]!==undefined]))}) as Record<string,WorkbookScalar>)),[fields.key]:makeTable(fields,project.creativeMemos.flatMap(m=>m.fields.map((f,position)=>({...f,memoId:m.id,position})))),[links.key]:makeTable(links,project.creativeMemos.flatMap(m=>arrays.flatMap(kind=>(m[kind]??[]).map((target,position)=>({memoId:m.id,kind,position,target})))))};
}
function ordered(rows:Record<string,WorkbookScalar>[],sheet:string){const positions=rows.map(r=>r.position);if(positions.some(p=>typeof p!=='number'||!Number.isInteger(p)||p<0)||new Set(positions).size!==positions.length)throw new WorkbookIssue(sheet,0,'순서','순서는 중복 없는 0 이상의 정수여야 합니다.');return [...rows].sort((a,b)=>Number(a.position)-Number(b.position));}
export function readPreparationTables(tables:AuthoringTables,project:StoryProject):StoryProject {
 const ps=readTable(tables,planning),ms=readTable(tables,memos),fs=readTable(tables,fields),ls=readTable(tables,links);
 if(ps.length!==1||!['free','five','four','three'].includes(String(ps[0].structureMode)))throw new WorkbookIssue(planning.title,3,'구조','기획 한 행과 올바른 구조가 필요합니다.');
 requireUnique(ms,'id',memos.title);const owners=new Set(ms.map(m=>m.id));
 for(const row of [...fs,...ls])if(!owners.has(row.memoId))throw new WorkbookIssue('메모 연결',0,'메모 ID','없는 메모를 참조합니다.');
 // Memo links intentionally survive removed cuts/chapters; character names can be free planning text.
 // readTable enforces their string type. Resolve missing targets in the UI, never discard them on import.
 const creativeMemos=ordered(ms,memos.title).map(m=>{
  if(!['free','character','relationship','place','event','task'].includes(String(m.kind)))throw new WorkbookIssue(memos.title,0,'종류','지원하지 않는 메모 종류입니다.');
  const ownedFields=fs.filter(f=>f.memoId===m.id);requireUnique(ownedFields,'id',fields.title);
  const mappedFields=ordered(ownedFields,fields.title).map(f=>{if(!['default','recommended','custom'].includes(String(f.source)))throw new WorkbookIssue(fields.title,0,'출처','지원하지 않는 출처입니다.');const {memoId:_owner,position:_position,...rest}=f;return rest;});
  const ownedLinks=ls.filter(l=>l.memoId===m.id);
  if(ownedLinks.some(l=>!arrays.includes(l.kind as typeof arrays[number])))throw new WorkbookIssue(links.title,0,'종류','지원하지 않는 연결 종류입니다.');
  const arrayValues=Object.fromEntries(arrays.flatMap(key=>{const selected=ordered(ownedLinks.filter(l=>l.kind===key),links.title);if(!m[key+'Present']){if(selected.length)throw new WorkbookIssue(links.title,0,'목록','목록 없음 상태에 연결 행이 있습니다.');return [];}return [[key,selected.map(l=>l.target)]];}));
  const {position:_position,linkedChapterIdsPresent:_chapters,linkedLineIdsPresent:_lines,linkedCharacterNamesPresent:_characters,...rest}=m;
  if(typeof m.order!=='number'||!Number.isInteger(m.order)||m.order<1||mappedFields.some(f=>typeof f.order!=='number'||!Number.isInteger(f.order)||f.order<1))throw new WorkbookIssue(memos.title,0,'표시 순서','표시 순서는 1 이상의 정수여야 합니다.');
  return {...Object.fromEntries(Object.entries(rest).filter(([,v])=>v!==undefined)),...arrayValues,fields:mappedFields} as unknown as CreativeMemo;
 });
 return {...project,planning:ps[0] as unknown as StoryPlanning,creativeMemos};
}
