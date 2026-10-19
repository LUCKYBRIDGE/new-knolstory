'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {exportAuthoringExcel,blankAuthoringArchive,exportStoryTable,serializeTableTsv,googleSheetTsvUrl} from '@knolstory/compatibility';
import {parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {portableStory,downloadArtifact} from '../lib/story-archive';
import {previewAuthoringFile} from '../lib/story-file-preview';
import type {AuthoringArchive} from '@knolstory/compatibility';
export function StoryTransferPanel({project,onImport,onError}:{project:StoryProject;onImport:(archive:AuthoringArchive)=>void;onError:(message:string)=>void}){
 const latest=useRef({onImport,onError});
 const scope=useRef(0);
 useLayoutEffect(()=>{latest.current={onImport,onError};},[onImport,onError]);
 useLayoutEffect(()=>{scope.current+=1;return()=>{scope.current+=1;};},[project.id]);
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false);
 async function exportTable(kind:'xlsx'|'tsv'){
  setBusy(true);try{const portable=await portableStory(project),parsed=parseStoryDocument(portable);if(!parsed.ok)throw new Error('작품 형식을 확인하세요.');
   const name=project.title.replace(/[\\/:*?"<>|]/g,'_');
   if(kind==='xlsx'){const bytes=await exportAuthoringExcel({format:'knolstory',document:parsed.document,audioResources:portable.audioResources??[]});downloadArtifact(bytes as unknown as BlobPart,`${name}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
   else downloadArtifact(serializeTableTsv(exportStoryTable(parsed.document,portable.audioResources??[])),`${name}.tsv`,'text/tab-separated-values');
  }catch(e){onError(String(e));}finally{setBusy(false);}
 }
 async function blankTemplate(){setBusy(true);try{const bytes=await exportAuthoringExcel(await blankAuthoringArchive('knolstory'));downloadArtifact(bytes as unknown as BlobPart,'뉴놀스토리_빈_편집양식.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}catch(e){onError(String(e));}finally{setBusy(false);}}
 async function readSheet(){const owner=scope.current;setBusy(true);try{
  const response=await fetch(googleSheetTsvUrl(url),{credentials:'omit',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('공개/게시된 Google 시트에 접근하지 못했습니다.');
  const text=await response.text();if(text.length>25_000_000)throw new Error('시트 자료가 너무 큽니다.');
  if(owner!==scope.current)return;
  const archive=await previewAuthoringFile(new File([text],'public-sheet.tsv',{type:'text/tab-separated-values'}));
  if(owner!==scope.current)return;latest.current.onImport(archive);
 }catch(e){if(owner===scope.current)latest.current.onError(`시트를 가져오지 못했어요. 현재 작품은 유지됩니다. ${String(e)}`);}finally{if(owner===scope.current)setBusy(false);}}
 return <details><summary>Excel · Google 시트</summary>
  <p>Excel 편집 양식에서는 작품 정보·장·컷·분기조건·인물 배치·연출·음향·표지·기획·메모를 시트별로 편집할 수 있어요. 각 시트의 안내에 따라 편집하고, 연결에 쓰이는 ID는 유지해 주세요.</p>
  <button disabled={busy} onClick={()=>void exportTable('xlsx')}>Excel 내보내기</button><button disabled={busy} onClick={()=>void blankTemplate()}>빈 공식 편집 양식</button>
  <p>Google 시트에서는 Excel 파일을 가져와 여러 탭을 편집한 뒤, 파일 → 다운로드 → Microsoft Excel(.xlsx)을 선택하세요. 내려받은 파일은 ‘작품 파일 가져오기’에서 확인 후 내 사본으로 열 수 있습니다. 한 탭만 내려받는 TSV는 전체 작품 양식이 아닙니다.</p>
  <details><summary>간단 표 v1 · 공개 시트</summary><p>이전 간단 표는 장과 컷의 일부 내용만 편집할 수 있어요. 작품 전체를 편집하려면 Excel 편집 양식을 사용해 주세요. ‘전체 보존’ 행에는 표에 보이지 않는 작품 정보가 있으므로 삭제하지 마세요.</p>
   <button disabled={busy} onClick={()=>void exportTable('tsv')}>Google 시트용 TSV 내보내기</button>
   <label>공개 Google 시트 주소<input aria-label="공개 Google 시트 주소" value={url} onChange={e=>setUrl(e.target.value)} type="url"/></label><button disabled={busy||!url} onClick={()=>void readSheet()}>Google 시트 가져오기</button>
  </details>{busy&&<p role="status">표 자료를 처리하고 있습니다.</p>}</details>;
}
