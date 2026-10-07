'use client';
import type {StoryProject} from '@knolstory/story-domain';
import {representativeStories,classicStories} from '@knolstory/compatibility';
import {NewStoryForm} from './new-story-form';
import {StoryTransferPanel} from './story-transfer-panel';
import styles from './story-workspace.module.css';
type Props={project:StoryProject;storyId:string;importedWorks:Record<string,string>;savedWorks:Record<string,StoryProject>;compact:boolean;manageOpen:boolean;hydrated:boolean;loadComplete:boolean;onManage:(open:boolean)=>void;onCreate:(title:string)=>boolean;onChoose:(id:string)=>void;onExport:()=>void;onSave:()=>void;onImportFile:(file?:File)=>void;onImportProject:(project:StoryProject)=>void;onError:(message:string)=>void;onLibrary:()=>void;onPrepare:()=>void};
export function WorkspaceManagement(p:Props){return <header className={styles.header}>
 <div className={styles.brand}>놀스토리</div><div className={styles.controls}><button onClick={p.onLibrary}>서재로</button><button onClick={p.onPrepare}>작품 준비</button></div>
 <details className={styles.management} open={!p.compact||p.manageOpen} onToggle={event=>{if(p.compact&&event.currentTarget.open!==p.manageOpen)p.onManage(event.currentTarget.open);}}><summary>작품 관리</summary><div className={styles.controls}>
 <NewStoryForm disabled={!p.hydrated} onCreate={p.onCreate}/>
 <select aria-label="작품 선택" disabled={!p.loadComplete} value={p.storyId} onChange={event=>p.onChoose(event.target.value)}>{[...representativeStories,...classicStories].map(story=><option key={story.id} value={story.id}>{story.id.endsWith('-classic')?'원작 · ':''}{story.label}</option>)}{Object.entries(p.importedWorks).map(([id,title])=><option key={id} value={id}>{id.startsWith('new:')?'내 작품':'가져온 작품'} · {id===p.storyId?p.project.title:p.savedWorks[id]?.title??title}</option>)}</select>
 <button onClick={p.onExport}>작품 파일 내보내기</button><a href="/shortstory">숏스토리</a><StoryTransferPanel project={p.project} onError={p.onError} onImport={p.onImportProject}/><button disabled={!p.hydrated} onClick={p.onSave}>지금 저장</button>
 <label className={styles.import}>작품 파일 가져오기<input aria-label="작품 파일 가져오기" disabled={!p.loadComplete} type="file" accept=".knolstory,.knolsotry,.nolstory,.json,.xlsx,.tsv,.csv" onChange={event=>{p.onImportFile(event.target.files?.[0]);event.target.value='';}}/></label>
 </div></details>
 </header>;}
