import {isStoryTextVariants,type StoryProject,type StoryTextVariant} from '@knolstory/story-domain';
import {makeTable,readTable,WorkbookIssue,type TableSpec,type AuthoringTables,type WorkbookScalar} from './model';
type Row=Record<string,WorkbookScalar>;
const c=(key:string,label:string,type:'text'|'number'='text')=>({key,label,type});
const variants:TableSpec={key:'textVariants',title:'조건별 글',columns:[c('lineId','컷 ID'),c('id','조건별 글 ID'),c('position','검사 순서','number'),c('text','바꿀 글')]};
const conditions:TableSpec={key:'textVariantConditions',title:'글 점수 조건',columns:[c('lineId','컷 ID'),c('variantId','조건별 글 ID'),c('position','조건 순서','number'),c('mode','조건 묶음'),c('scoreId','점수 ID'),c('operator','비교 방법'),c('value','비교 점수','number')]};
export const TEXT_VARIANT_SPECS=[variants,conditions];
function ordered(rows:Row[],spec:TableSpec){const sorted=[...rows].sort((a,b)=>Number(a.position)-Number(b.position));if(sorted.some((row,index)=>row.position!==index))throw new WorkbookIssue(spec.title,0,'순서','0부터 빠짐없이 중복 없는 순서를 써 주세요.');return sorted;}
export function exportTextVariantTables(project:StoryProject):AuthoringTables{return {[variants.key]:makeTable(variants,project.lines.flatMap(line=>(line.textVariants??[]).map((variant,position)=>({lineId:line.id,id:variant.id,position,text:variant.text})))),[conditions.key]:makeTable(conditions,project.lines.flatMap(line=>(line.textVariants??[]).flatMap(variant=>variant.condition.terms.map((term,position)=>({lineId:line.id,variantId:variant.id,position,mode:variant.condition.mode,...term})))))};}
/** Only the wholly missing extension is an explicit older scalar workbook8 adapter. */
export function upgradeTextVariantTables(tables:AuthoringTables):AuthoringTables{
 const cuts=tables.cuts;if(!cuts)return tables;const marker=cuts.headers.includes('textVariantsPresent'),v=!!tables.textVariants,t=!!tables.textVariantConditions;
 if(marker||v||t){if(!marker||!v||!t)throw new WorkbookIssue('조건별 글',0,'탭','조건별 글 표시 열과 두 편집 탭을 함께 유지해 주세요.');return tables;}
 return {...tables,cuts:{headers:[...cuts.headers,'textVariantsPresent'],rows:cuts.rows.map(row=>[...row,'false'])},[variants.key]:makeTable(variants,[]),[conditions.key]:makeTable(conditions,[])};
}
export function readTextVariantTables(tables:AuthoringTables,project:StoryProject):StoryProject{
 const vs=readTable(tables,variants),cs=readTable(tables,conditions),cuts=tables.cuts,marker=cuts.headers.indexOf('textVariantsPresent'),idColumn=cuts.headers.indexOf('id');
 const present=new Set(cuts.rows.filter(row=>['true','있음'].includes(row[marker]?.toLowerCase())).map(row=>row[idColumn]));
 for(const row of vs)if(!present.has(String(row.lineId))||!project.lines.some(line=>line.id===row.lineId))throw new WorkbookIssue(variants.title,0,'컷 ID','조건별 글 있음으로 표시한 실제 컷에 연결해 주세요.');
 for(const row of cs)if(!vs.some(v=>v.lineId===row.lineId&&v.id===row.variantId))throw new WorkbookIssue(conditions.title,0,'조건별 글 ID','연결된 글이 없습니다.');
 return {...project,lines:project.lines.map(line=>{if(!present.has(line.id))return line;const rows=ordered(vs.filter(row=>row.lineId===line.id),variants),values=rows.map(row=>{const terms=ordered(cs.filter(c=>c.lineId===line.id&&c.variantId===row.id),conditions);if(!terms.length||terms.some(term=>term.mode!==terms[0].mode))throw new WorkbookIssue(conditions.title,0,'조건','한 개 이상의 조건과 같은 묶음을 써 주세요.');return {id:row.id,text:row.text,condition:{mode:terms[0].mode,terms:terms.map(term=>({scoreId:term.scoreId,operator:term.operator,value:term.value}))}};});if(!isStoryTextVariants(values))throw new WorkbookIssue(variants.title,0,'글','ID·본문·조건을 확인해 주세요.');return {...line,textVariants:values as StoryTextVariant[]};})};
}
