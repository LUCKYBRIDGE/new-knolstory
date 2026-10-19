import {assertCatalogOnlyMedia} from './catalog-only-authoring';
import {decodeAuthoringArchive,importLoadedAuthoringExcel,createAuthoringArchive,importStoryExcel,importShortStoryExcel,importStoryTable,parseTableCsv,parseTableTsv,type AuthoringArchive} from '@knolstory/compatibility';
import {compileStoryScene} from '@knolstory/runtime-core';
import {createExcelWorkbook,checkExcelArchive} from '@knolstory/compatibility';
/** Validate completely before IDB writes or visible project replacement. */
export async function previewAuthoringFile(file:File):Promise<AuthoringArchive>{
 if(file.size>25_000_000)throw Error('작품·편집 양식은 25MB 이하로 선택해 주세요.');
 const extension=file.name.toLowerCase().split('.').at(-1);let archive:AuthoringArchive;
 if(extension==='xlsx'){
  const bytes=new Uint8Array(await file.arrayBuffer());
  // Existing Next v1 remains readable; malformed v2 must never fall back to an older interpretation.
  checkExcelArchive(bytes);const book=await createExcelWorkbook();try{await book.xlsx.load(bytes as never);}catch{throw Error('Excel 파일을 읽지 못했습니다.');}
  if(book.getWorksheet('형식 정보'))archive=await importLoadedAuthoringExcel(book);
  else{const kind=book.getWorksheet('KnolStory Next')?.getCell(1,3).text;if(kind==='shortstory')archive=await createAuthoringArchive({format:'shortstory',project:await importShortStoryExcel(bytes)});else{const old=await importStoryExcel(bytes);archive=await createAuthoringArchive({format:'knolstory',document:old.document,audioResources:old.audioResources as never});}}
 }else if(extension==='csv'||extension==='tsv'){
  const old=importStoryTable((extension==='csv'?parseTableCsv:parseTableTsv)(await file.text()));archive=await createAuthoringArchive({format:'knolstory',document:old.document,audioResources:old.audioResources as never});
 }else archive=await decodeAuthoringArchive(await file.text());
 assertCatalogOnlyMedia(archive);
 if(archive.format==='knolstory'){
  if(!archive.document.project.lines.length)throw Error('편집할 컷이 없는 작품입니다.');
  for(const line of archive.document.project.lines)compileStoryScene(archive.document.project,line.id,0,{mode:'edit'});
 }
 return archive;
}
