import {storyBranchConditionTerms, type StoryProject, type StoryLine} from '@knolstory/story-domain';
import {makeTable,readTable,requireUnique,WorkbookIssue,type TableSpec,type AuthoringTables,type WorkbookScalar} from './model';
type Row=Record<string,WorkbookScalar>;
const c=(key:string,label:string,type:'text'|'number'|'boolean'='text',optional=false)=>({key,label,type,optional});
const owners:TableSpec={key:'sceneVisibility',title:'컷 표시 조건',columns:[c('lineId','컷 ID'),c('scoresPresent','점수 조건 있음','boolean'),c('choicesPresent','선택 조건 있음','boolean'),c('choicesMode','선택 조건 묶음','text',true)]};
const scores:TableSpec={key:'sceneVisibilityScores',title:'컷 표시 점수',columns:[c('lineId','컷 ID'),c('position','조건 순서','number'),c('mode','조건 묶음'),c('scoreId','점수 ID'),c('operator','비교 방법'),c('value','비교 점수','number')]};
const choices:TableSpec={key:'sceneVisibilityChoices',title:'컷 표시 선택',columns:[c('lineId','컷 ID'),c('position','조건 순서','number'),c('sourceLineId','선택지가 있는 컷 ID'),c('choiceId','선택지 ID')]};
export const VISIBILITY_SPECS=[owners,scores,choices];
export function exportVisibilityTables(project:StoryProject):AuthoringTables{
 return {
  [owners.key]:makeTable(owners,project.lines.flatMap(line=>line.visibility?[{lineId:line.id,scoresPresent:line.visibility.scores!==undefined,choicesPresent:line.visibility.choices!==undefined,choicesMode:line.visibility.choices&&'mode' in line.visibility.choices?line.visibility.choices.mode:undefined}]:[])),
  [scores.key]:makeTable(scores,project.lines.flatMap(line=>(line.visibility?.scores?.terms??[]).map((term,position)=>({lineId:line.id,position,mode:line.visibility!.scores!.mode,...term})))),
  [choices.key]:makeTable(choices,project.lines.flatMap(line=>line.visibility?.choices?storyBranchConditionTerms(line.visibility.choices).map((term,position)=>({lineId:line.id,position,...term})):[])),
 };
}
/** Only a wholly absent extension is an older scalar workbook adapter. */
export function upgradeVisibilityTables(tables:AuthoringTables):AuthoringTables{
 const cuts=tables.cuts;if(!cuts)return tables;
 const marker=cuts.headers.includes('visibilityPresent'),present=VISIBILITY_SPECS.map(spec=>!!tables[spec.key]);
 if(marker||present.some(Boolean)){
  if(!marker||present.some(value=>!value))throw new WorkbookIssue(owners.title,0,'탭','컷 표시 조건 열과 세 편집 탭을 함께 유지해 주세요.');
  return tables;
 }
 return {...tables,cuts:{headers:[...cuts.headers,'visibilityPresent'],rows:cuts.rows.map(row=>[...row,'false'])},...Object.fromEntries(VISIBILITY_SPECS.map(spec=>[spec.key,makeTable(spec,[])]))};
}
function ordered(rows:Row[],spec:TableSpec){
 const result=[...rows].sort((a,b)=>Number(a.position)-Number(b.position));
 if(result.some((row,index)=>row.position!==index))throw new WorkbookIssue(spec.title,0,'조건 순서','0부터 빠짐없이 중복 없는 순서를 써 주세요.');
 return result;
}
export function readVisibilityTables(tables:AuthoringTables,project:StoryProject):StoryProject{
 const rows=readTable(tables,owners),scoreRows=readTable(tables,scores),choiceRows=readTable(tables,choices);
 requireUnique(rows,'lineId',owners.title);
 // Read the marker through the shared scalar decoder, including escaped literal IDs.
 const markerIndex=tables.cuts.headers.indexOf('visibilityPresent');
 // Other cut columns include optional cells: use a narrow projected table instead.
 const markerRows=readTable({cuts:{headers:['lineId','present'],rows:tables.cuts.rows.map(row=>[row[tables.cuts.headers.indexOf('id')],row[markerIndex]])}},{key:'cuts',title:'컷',columns:[c('lineId','컷 ID'),c('present','컷 표시 조건 있음','boolean')]});
 const present=new Set(markerRows.filter(row=>row.present).map(row=>row.lineId));
 if(rows.some(row=>!present.has(row.lineId)||!project.lines.some(line=>line.id===row.lineId))||present.size!==rows.length)throw new WorkbookIssue(owners.title,0,'컷 ID','표시 조건이 있는 컷마다 조건 행을 하나씩 연결해 주세요.');
 for(const [terms,spec] of [[scoreRows,scores],[choiceRows,choices]] as const)if(terms.some(term=>!rows.some(row=>row.lineId===term.lineId)))throw new WorkbookIssue(spec.title,0,'컷 ID','표시 조건이 없는 컷의 조건입니다.');
 return {...project,lines:project.lines.map(line=>{
  const row=rows.find(row=>row.lineId===line.id);if(!row)return line;
  const ss=ordered(scoreRows.filter(term=>term.lineId===line.id),scores),cs=ordered(choiceRows.filter(term=>term.lineId===line.id),choices);
  if(!row.scoresPresent&&ss.length||!row.choicesPresent&&(cs.length||row.choicesMode!==undefined)||!row.scoresPresent&&!row.choicesPresent)throw new WorkbookIssue(owners.title,0,'조건','조건 있음 표시와 작성 내용을 맞춰 주세요.');
  if(row.scoresPresent&&(!ss.length||ss.some(term=>term.mode!==ss[0].mode))||row.choicesPresent&&(!cs.length||row.choicesMode===undefined&&cs.length!==1))throw new WorkbookIssue(owners.title,0,'조건','점수 조건은 같은 묶음으로, 단일 선택 조건은 한 행으로 작성해 주세요.');
  const terms=cs.map(term=>({sourceLineId:term.sourceLineId,choiceId:term.choiceId}));
  const visibility={...(row.scoresPresent?{scores:{mode:ss[0].mode,terms:ss.map(term=>({scoreId:term.scoreId,operator:term.operator,value:term.value}))}}:{}),...(row.choicesPresent?{choices:row.choicesMode===undefined?terms[0]:{mode:row.choicesMode,terms}}:{})};
  return {...line,visibility:visibility as NonNullable<StoryLine['visibility']>};
 })};
}
