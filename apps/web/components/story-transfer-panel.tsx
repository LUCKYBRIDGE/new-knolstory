'use client';
import {useState} from 'react';
import {exportStoryExcel,exportStoryTable,serializeTableTsv,googleSheetTsvUrl,importStoryTable,parseTableTsv} from '@knolstory/compatibility';
import {parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {portableStory,loadStoryArchive,downloadArtifact} from '../lib/story-archive';
export function StoryTransferPanel({project,onImport,onError}:{project:StoryProject;onImport:(project:StoryProject)=>void;onError:(message:string)=>void}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false);
 async function exportTable(kind:'xlsx'|'tsv'){
  setBusy(true);try{const portable=await portableStory(project),parsed=parseStoryDocument(portable);if(!parsed.ok)throw new Error('작품 형식을 확인하세요.');
   const name=project.title.replace(/[\\/:*?"<>|]/g,'_');
   if(kind==='xlsx'){const bytes=await exportStoryExcel(parsed.document,portable.audioResources??[]);downloadArtifact(bytes as unknown as BlobPart,`${name}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
   else downloadArtifact(serializeTableTsv(exportStoryTable(parsed.document,portable.audioResources??[])),`${name}.tsv`,'text/tab-separated-values');
  }catch(e){onError(String(e));}finally{setBusy(false);}
 }
 async function readSheet(){setBusy(true);try{
  const response=await fetch(googleSheetTsvUrl(url),{credentials:'omit',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('공개/게시된 Google 시트에 접근하지 못했습니다.');
  const text=await response.text();if(text.length>25_000_000)throw new Error('시트 자료가 너무 큽니다.');
  const archive=importStoryTable(parseTableTsv(text.replace(/^\uFEFF/,'')));onImport(await loadStoryArchive({...archive.document,audioResources:archive.audioResources}));
 }catch(e){onError(`시트를 가져오지 못했어요. 현재 작품은 유지됩니다. ${String(e)}`);}finally{setBusy(false);}}
 return <details><summary>Excel · Google 시트</summary><p>Next 표는 장·컷을 편집하는 행과 전체 기능 보존 자료를 함께 담습니다. 보존 행을 삭제하지 마세요. 구형8탭/4탭은 자동 변환하지 않습니다.</p><button disabled={busy} onClick={()=>void exportTable('xlsx')}>Excel 내보내기</button><button disabled={busy} onClick={()=>void exportTable('tsv')}>Google 시트용 TSV 내보내기</button><p>TSV 파일을 Google 시트에 가져와 편집한 뒤, 공개 시트 주소 또는 다운로드한 TSV/Excel 파일로 다시 가져올 수 있습니다.</p><label>공개 Google 시트 주소<input aria-label="공개 Google 시트 주소" value={url} onChange={e=>setUrl(e.target.value)} type="url"/></label><button disabled={busy||!url} onClick={()=>void readSheet()}>Google 시트 가져오기</button>{busy&&<p role="status">표 자료를 처리하고 있습니다.</p>}</details>;
}
