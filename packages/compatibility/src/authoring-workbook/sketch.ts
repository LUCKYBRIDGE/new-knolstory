import {isPicturebookSketch,type StoryProject} from '@knolstory/story-domain';
import {makeTable,readTable,requireUnique,WorkbookIssue,type TableSpec,type AuthoringTables} from './model';
const c=(key:string,label:string,type:'text'|'number'|'boolean'='text',optional=false)=>({key,label,type,optional});
/** One row per chapter that keeps the picture-book page it was made from (document v9). */
const sketches:TableSpec={key:'chapterSketches',title:'그림책 구상 삽화',columns:[c('chapterId','장 ID'),c('backgroundId','그림책 배경 ID'),c('leftAssetId','그림책 왼쪽 인물 ID'),c('rightAssetId','그림책 오른쪽 인물 ID'),c('recipeVersion','숏스토리 추천 검토 버전','number',true)]};
export const SKETCH_SPECS=[sketches];
export function exportSketchTables(project:StoryProject):AuthoringTables{
 return {[sketches.key]:makeTable(sketches,project.chapters.flatMap(chapter=>chapter.picturebookSketch?[{chapterId:chapter.id,...chapter.picturebookSketch}]:[]))};
}
/** Workbooks written before document v9 have no sketch tab: they mean “no sketches”. */
export function upgradeSketchTables(tables:AuthoringTables):AuthoringTables{
 return tables[sketches.key]?tables:{...tables,[sketches.key]:makeTable(sketches,[])};
}
export function readSketchTables(tables:AuthoringTables,project:StoryProject):StoryProject{
 const rows=readTable(tables,sketches);
 requireUnique(rows,'chapterId',sketches.title);
 const byChapter=new Map(rows.map(row=>[row.chapterId,row]));
 for(const row of rows){
  if(!project.chapters.some(chapter=>chapter.id===row.chapterId))throw new WorkbookIssue(sketches.title,0,'장 ID','없는 장의 그림책 구상 삽화예요.');
  const {chapterId:_chapterId,...value}=row;
  const sketch=Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined));
  if(!isPicturebookSketch(sketch))throw new WorkbookIssue(sketches.title,0,'그림책 구상 삽화','배경·인물 ID 중 하나 이상과 1 이상의 검토 버전을 확인해 주세요.');
 }
 return {...project,chapters:project.chapters.map(chapter=>{
  const row=byChapter.get(chapter.id);if(!row)return chapter;
  const {chapterId:_chapterId,...value}=row;
  return {...chapter,picturebookSketch:Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined)) as NonNullable<typeof chapter.picturebookSketch>};
 })};
}
