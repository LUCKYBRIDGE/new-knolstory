'use client';
/* eslint-disable @next/next/no-img-element -- static ShortStory pages and print illustration */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { newShortStory, newShortStoryPage, decodeShortStory, encodeShortStory, exportShortStoryExcel, importShortStoryExcel, importShortStoryTable, exportShortStoryTable, serializeTableTsv, parseTableTsv, googleSheetTsvUrl } from '@knolstory/compatibility';
import { resolveAsset } from '@knolstory/asset-registry';
import { AssetPickerField } from '../../components/asset-picker-field';
import styles from './shortstory.module.css';
type Project = ReturnType<typeof newShortStory>;
type Page = Project['pages'][number];
const STORAGE = 'knolstory-shortstory-workspace-v1';
function Art({page,label}:{page:Pick<Page,'backgroundId'|'leftAssetId'|'rightAssetId'>;label:string}) {
 const background=resolveAsset(page.backgroundId),left=resolveAsset(page.leftAssetId),right=resolveAsset(page.rightAssetId);
 return <div className={styles.art} role="img" aria-label={label}>
  {background&&<img className={styles.background} src={background.src} alt=""/>}
  {left&&<img className={styles.left} src={left.src} alt=""/>}
  {right&&<img className={styles.right} src={right.src} alt=""/>}
  {!background&&!left&&!right&&<span>그림 없는 쪽</span>}
 </div>;
}
function download(content:BlobPart,name:string,type:string) {
 const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function ShortStoryWorkspace() {
 const [project,setProject]=useState<Project|null>(null);const [index,setIndex]=useState(0);const [editing,setEditing]=useState(true);
 const [notice,setNotice]=useState('');const [error,setError]=useState('');const [blocked,setBlocked]=useState(false);const [sheet,setSheet]=useState('');const [busy,setBusy]=useState(false);
 const file=useRef<HTMLInputElement>(null);const dirty=useRef(false);
 useEffect(()=>{const timer=setTimeout(()=>{try {const stored=localStorage.getItem(STORAGE);setProject(stored?decodeShortStory(stored):newShortStory());}catch(e){setError(`보관된 그림책을 열지 못했어요. 원본 보관 후 새 작품을 시작해 주세요. ${e instanceof Error?e.message:''}`);setBlocked(true);setProject(newShortStory());}},0);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{if(!project||blocked||!dirty.current)return;const timer=setTimeout(()=>{try{localStorage.setItem(STORAGE,encodeShortStory(project));setNotice('이 기기에 자동 저장했어요.');dirty.current=false;}catch{setError('기기 저장 공간을 확인해 주세요. 현재 글을 파일로 보관할 수 있어요.');}},500);return()=>clearTimeout(timer);},[project,blocked]);
 if(!project)return <main className={styles.shell}><p>그림책을 여는 중이에요.</p></main>;
 const current=project.pages[Math.min(index,project.pages.length-1)];
 const update=(next:Project)=>{dirty.current=true;setProject({...next,updatedAt:new Date().toISOString()});setError('');};
 const patch=(values:Partial<Page>)=>update({...project,pages:project.pages.map(p=>p.id===current.id?{...p,...values}:p)});
 const save=()=>{try{localStorage.setItem(STORAGE,encodeShortStory(project));dirty.current=false;setNotice('이 기기에 저장했어요.');setError('');}catch{setError('기기에 저장하지 못했어요. 파일로 보관해 주세요.');}};
 const accept=(next:Project)=>{setBlocked(false);update(next);setIndex(0);setEditing(true);setNotice('그림책을 가져왔어요.');};
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'자료를 열지 못했어요.');}finally{setBusy(false);}};
 const add=()=>{const next=newShortStoryPage();update({...project,pages:[...project.pages.slice(0,index+1),next,...project.pages.slice(index+1)].map((p,i)=>({...p,order:i+1}))});setIndex(index+1);};
 const move=(offset:number)=>{const target=index+offset;if(target<0||target>=project.pages.length)return;const pages=project.pages.filter(p=>p.id!==current.id);const ordered=[...pages.slice(0,target),current,...pages.slice(target)].map((p,i)=>({...p,order:i+1}));update({...project,pages:ordered});setIndex(target);};
 const cover={backgroundId:project.cover.backgroundId,leftAssetId:project.cover.characterId,rightAssetId:''};
 return <main className={styles.shell}>
  <header className={styles.header}><div><Link href="/">놀스토리로 돌아가기</Link><h1>숏스토리 그림책</h1><p>그림과 글로 쪽을 구성하고 읽거나 A4로 인쇄해요.</p></div><div className={styles.actions}><button onClick={()=>{setEditing(true);setIndex(0);}} aria-pressed={editing}>쓰기</button><button onClick={()=>{setEditing(false);setIndex(0);}} aria-pressed={!editing}>읽기</button></div></header>
  {error&&<p role="alert" className={styles.error}>{error}</p>}{blocked&&<button onClick={()=>{const raw=localStorage.getItem(STORAGE);if(raw)download(raw,'그림책-원본.shortstory','application/json');}}>열리지 않는 원본 보관</button>}{notice&&<p role="status">{notice}</p>}
  <section className={styles.tools} aria-label="그림책 파일과 이름">
   <label>이야기 제목<input value={project.title} disabled={blocked} onChange={e=>update({...project,title:e.target.value})}/></label>
   <label>지은이<input value={project.authorDisplayName} disabled={blocked} onChange={e=>update({...project,authorDisplayName:e.target.value})}/></label>
   <div className={styles.actions}><button disabled={blocked} onClick={save}>이 기기에 저장</button><button onClick={()=>download(encodeShortStory(project),`${project.title||'그림책'}.shortstory`,'application/json')}>.shortstory로 보관</button><button disabled={busy} onClick={()=>void run(async()=>{const bytes=await exportShortStoryExcel(project);download(new Uint8Array(bytes),`${project.title||'그림책'}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');})}>Excel로 보관</button><button onClick={()=>download(serializeTableTsv(exportShortStoryTable(project)),`${project.title||'그림책'}.tsv`,'text/tab-separated-values')}>시트용 TSV 보관</button><button disabled={busy} onClick={()=>file.current?.click()}>파일 가져오기</button><button onClick={()=>{accept(newShortStory());setNotice('새 그림책을 만들었어요.');}}>새 그림책</button><button onClick={()=>window.print()}>A4 인쇄</button></div>
   <input className={styles.hidden} ref={file} type="file" accept=".shortstory,.xlsx,.tsv,.json" aria-label="숏스토리 파일 가져오기" onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(selected)void run(async()=>{if(selected.size>20*1024*1024)throw new Error('20MB 이하의 그림책 파일을 선택해 주세요.');accept(selected.name.endsWith('.xlsx')?await importShortStoryExcel(new Uint8Array(await selected.arrayBuffer())):selected.name.endsWith('.tsv')?importShortStoryTable(parseTableTsv(await selected.text())):decodeShortStory(await selected.text()));});}}/>
   <details><summary>표지·소개·공개 Google 시트</summary><div className={styles.metadata}>
    <label>이야기 소개<textarea disabled={blocked} value={project.description} onChange={e=>update({...project,description:e.target.value})}/></label>
    <label>마지막 인사<textarea disabled={blocked} value={project.cover.authorNote} onChange={e=>update({...project,cover:{...project.cover,authorNote:e.target.value}})}/></label>
    <AssetPickerField label="표지 배경" type="background" value={project.cover.backgroundId} onChange={id=>{if(!blocked)update({...project,cover:{...project.cover,backgroundId:id}});}}/>
    <AssetPickerField label="표지 인물" type="character" value={project.cover.characterId} onChange={id=>{if(!blocked)update({...project,cover:{...project.cover,characterId:id}});}}/>
    <label>공개 Google 시트 주소<input value={sheet} onChange={e=>setSheet(e.target.value)}/></label><button disabled={busy||!sheet.trim()} onClick={()=>void run(async()=>{const response=await fetch(googleSheetTsvUrl(sheet));if(!response.ok)throw new Error('공개 시트를 읽지 못했어요. 게시 설정을 확인해 주세요.');accept(importShortStoryTable(parseTableTsv(await response.text())));})}>시트 가져오기</button>
   </div></details>
  </section>
  <div className={styles.workspace}>
   <nav className={styles.contents} aria-label="그림책 쪽 목록"><h2>전체 구성 · {project.pages.length}쪽</h2>{project.pages.map((p,i)=><button key={p.id} aria-current={i===index?'page':undefined} onClick={()=>setIndex(i)}>{i+1}쪽 · {p.title||'제목 없는 쪽'}</button>)}</nav>
   <section className={styles.focus} aria-label={editing?'숏스토리 쓰기':'숏스토리 읽기'}>
    <h2>{index+1}쪽{current.title&&` · ${current.title}`}</h2><Art page={current} label={`${index+1}쪽 삽화`}/>
    {editing?<fieldset disabled={blocked}><label>이 쪽 제목<input value={current.title} onChange={e=>patch({title:e.target.value})}/></label><label>이 쪽의 이야기<textarea rows={7} value={current.text} onChange={e=>patch({text:e.target.value})}/></label><details><summary>이 쪽 그림 고르기</summary><div className={styles.metadata}><AssetPickerField label="쪽 배경" type="background" value={current.backgroundId} onChange={id=>patch({backgroundId:id})}/><AssetPickerField label="왼쪽 인물" type="character" value={current.leftAssetId} onChange={id=>patch({leftAssetId:id})}/><AssetPickerField label="오른쪽 인물" type="character" value={current.rightAssetId} onChange={id=>patch({rightAssetId:id})}/></div></details><div className={styles.actions}><button onClick={add}>현재 쪽 뒤에 빈 쪽 추가</button><button onClick={()=>{const copy={...current,id:crypto.randomUUID()};update({...project,pages:[...project.pages.slice(0,index+1),copy,...project.pages.slice(index+1)].map((p,i)=>({...p,order:i+1}))});setIndex(index+1);}}>현재 쪽 복제</button><button disabled={index===0} onClick={()=>move(-1)}>쪽 앞으로 이동</button><button disabled={index===project.pages.length-1} onClick={()=>move(1)}>쪽 뒤로 이동</button><button disabled={project.pages.length===1} onClick={()=>{update({...project,pages:project.pages.filter(p=>p.id!==current.id).map((p,i)=>({...p,order:i+1}))});setIndex(Math.max(0,index-1));}}>현재 쪽 삭제</button></div></fieldset>:<p className={styles.storyText}>{current.text||'아직 글이 없는 쪽이에요.'}</p>}
    <nav className={styles.actions} aria-label="숏스토리 쪽 이동"><button disabled={index===0} onClick={()=>setIndex(index-1)}>이전 쪽</button><span>{index+1} / {project.pages.length}</span><button disabled={index===project.pages.length-1} onClick={()=>setIndex(index+1)}>다음 쪽</button></nav>
   </section>
  </div>
  <section className={styles.printBook} data-shortstory-print aria-label="A4 그림책 인쇄">
   <article><Art page={cover} label="표지"/><h1>{project.title}</h1><p>{project.description}</p><p>{project.authorDisplayName&&`${project.authorDisplayName} 지음`}</p></article>
   {project.pages.map((p,i)=><article key={p.id}><Art page={p} label={`${i+1}쪽 삽화`}/><h2>{p.title}</h2><p>{p.text}</p><small>{i+1}쪽</small></article>)}
   {project.cover.authorNote&&<article><h2>{project.title}</h2><p>{project.cover.authorNote}</p></article>}
  </section>
 </main>;
}
