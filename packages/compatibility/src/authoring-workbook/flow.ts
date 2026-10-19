import { isStoryFlow, type StoryProject, type StoryFlow } from '@knolstory/story-domain';
import {makeTable,readTable,requireUnique,WorkbookIssue,type AuthoringTables,type TableSpec,type WorkbookScalar} from './model';
const c=(key:string,label:string,type:'text'|'number'|'boolean'='text',optional=false)=>({key,label,type,optional});
const flow:TableSpec={key:'flows',title:'컷 흐름',columns:[c('lineId','컷 ID'),c('type','흐름 종류'),c('targetKind','도착 종류','text',true),c('targetLineId','도착 컷 ID','text',true),c('routesPresent','조건 경로 있음','boolean')]};
const choices:TableSpec={key:'flowChoices',title:'선택지',columns:[c('lineId','컷 ID'),c('id','선택지 ID'),c('position','배열 순서','number'),c('label','선택 문구'),c('targetKind','도착 종류'),c('targetLineId','도착 컷 ID','text',true),c('conditionPresent','표시 조건 있음','boolean'),c('effectsPresent','점수 변경 있음','boolean')]};
const endings:TableSpec={key:'endings',title:'엔딩',columns:[c('lineId','컷 ID'),c('name','엔딩 이름'),c('description','설명'),c('endsStory','이야기 종료','boolean')]};
export const FLOW_SPECS:TableSpec[]=[flow,choices,endings];
function targetFields(target:string|null){return {targetKind:target===null?'end':target===''?'pending':'cut',targetLineId:target===null||target===''?undefined:target};}
export function exportFlowTables(project:StoryProject):AuthoringTables {
 return {[flow.key]:makeTable(flow,project.lines.flatMap(line=>line.flow?[{lineId:line.id,type:line.flow.type,routesPresent:line.flow.type==='goto'&&line.flow.routes!==undefined,...(line.flow.type==='goto'?targetFields(line.flow.targetLineId):{})}]:[])),[choices.key]:makeTable(choices,project.lines.flatMap(line=>line.flow?.type==='choice'?line.flow.options.map((option,position)=>({lineId:line.id,id:option.id,label:option.label,position,conditionPresent:option.condition!==undefined,effectsPresent:option.effects!==undefined,...targetFields(option.targetLineId)})):[])),[endings.key]:makeTable(endings,project.lines.flatMap(line=>line.ending?[{lineId:line.id,...line.ending}]:[]))};
}
function readTarget(row:Record<string,WorkbookScalar>,ids:Set<string>,sheet:string):string|null {
 if(row.targetKind==='end'||row.targetKind==='pending'){if(row.targetLineId!==undefined&&row.targetLineId!=='')throw new WorkbookIssue(sheet,0,'도착 컷 ID','끝 또는 연결 대기에는 도착 컷을 쓰지 않습니다.');return row.targetKind==='end'?null:'';}
 if(row.targetKind!=='cut'||typeof row.targetLineId!=='string'||!ids.has(row.targetLineId))throw new WorkbookIssue(sheet,0,'도착 컷 ID','존재하는 컷 ID 또는 end/pending 도착 종류가 필요합니다.');
 return row.targetLineId;
}
export function readFlowTables(tables:AuthoringTables,project:StoryProject):StoryProject {
 const fs=readTable(tables,flow),options=readTable(tables,choices),es=readTable(tables,endings),ids=new Set(project.lines.map(l=>l.id));
 requireUnique(fs,'lineId',flow.title);requireUnique(es,'lineId',endings.title);
 for(const row of [...fs,...es,...options])if(!ids.has(String(row.lineId)))throw new WorkbookIssue(flow.title,0,'컷 ID','없는 컷입니다.');
 for(const row of options)if(!fs.some(f=>f.lineId===row.lineId&&f.type==='choice'))throw new WorkbookIssue(choices.title,0,'컷 ID','선택 흐름이 없는 컷입니다.');
 const mapped=new Map<string,StoryFlow>();
 for(const f of fs){let value:StoryFlow;if(f.type==='goto')value={type:'goto',targetLineId:readTarget(f,ids,flow.title)};
 else if(f.type==='choice'){
  if(f.routesPresent)throw new WorkbookIssue(flow.title,0,'조건 경로','선택 흐름에는 조건 경로를 추가하지 않습니다.');
  if(f.targetKind!==undefined||f.targetLineId!==undefined)throw new WorkbookIssue(flow.title,0,'도착','선택 흐름의 도착은 선택지 탭에서 작성합니다.');
  const owned=options.filter(o=>o.lineId===f.lineId);requireUnique(owned,'id',choices.title);
  const positions=owned.map(o=>o.position);if(positions.some(p=>typeof p!=='number'||!Number.isInteger(p)||p<0)||new Set(positions).size!==positions.length)throw new WorkbookIssue(choices.title,0,'배열 순서','중복 없는 0 이상의 정수여야 합니다.');
  value={type:'choice',options:[...owned].sort((a,b)=>Number(a.position)-Number(b.position)).map(o=>({id:String(o.id),label:String(o.label),targetLineId:readTarget(o,ids,choices.title)}))};
 }else throw new WorkbookIssue(flow.title,0,'흐름 종류','goto 또는 choice를 입력해 주세요.');
 if(!isStoryFlow(value))throw new WorkbookIssue(flow.title,0,'선택지','선택지는 중복 없는 ID로 2~4개 작성해 주세요.');if(value.type==='goto'&&f.routesPresent)value={...value,routes:[]};
 if(value.type==='choice')value={...value,options:value.options.map(option=>{const row=options.find(o=>o.lineId===f.lineId&&o.id===option.id)!;return {...option,...(row.effectsPresent?{effects:[]}:{}),...(row.conditionPresent?{condition:{mode:'all' as const,terms:[]}}:{})};})};mapped.set(String(f.lineId),value);
 }
 return {...project,lines:project.lines.map(line=>{const {flow:_flow,ending:_ending,...rest}=line;const ending=es.find(e=>e.lineId===line.id);return {...rest,...(mapped.has(line.id)?{flow:mapped.get(line.id)}:{}),...(ending?{ending:{name:String(ending.name),description:String(ending.description),endsStory:Boolean(ending.endsStory)}}:{})};})};
}
