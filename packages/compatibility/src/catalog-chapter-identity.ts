import {branchChapterNumbering,type StoryProject} from '@knolstory/story-domain';
import {renameProvidedChapterTitles} from './catalog-chapter-titles';
const provided=new Set(['pinky-review-main-004','heungbu-nolbu-nolstory','pinky-review-main-003','pinky-review-main-002']);
const baseId=(id:string)=>id.replace(/-cruelty-.+$/u,'');
/** Called only after the catalog resolver's exact-version gate. Runtime order and links stay intact. */
export function connectCatalogChapterIdentity(project:StoryProject):StoryProject{
 if(!provided.has(project.id)||project.chapters.every(chapter=>chapter.chapterNumber!==undefined))return project;
 // Numbers and branch letters follow the links (shared with the editor's 장 정리): 10장 → 11A·11B by the choice taken.
 const numbering=branchChapterNumbering(project),active=numbering.reachable;
 const rank=new Map(project.chapters.map(chapter=>[chapter.id,numbering.identities.get(chapter.id)?.chapterNumber??1]));
 // The preserved, disconnected Onggojib verdict manuscripts correspond to later reachable copies.
 for(const chapter of project.chapters.filter(chapter=>!active.has(chapter.id))){const peers=project.chapters.filter(peer=>active.has(peer.id)&&baseId(peer.id)===baseId(chapter.id));if(peers.length)rank.set(chapter.id,Math.max(...peers.map(peer=>rank.get(peer.id)!)));}
 const chapters=project.chapters.map(chapter=>{const chapterNumber=rank.get(chapter.id)!,branchLabel=!active.has(chapter.id)?'미연결 원고':numbering.identities.get(chapter.id)?.branchLabel;return {...chapter,chapterNumber,...(branchLabel?{branchLabel}:{})};});
 chapters.sort((a,b)=>a.chapterNumber-b.chapterNumber||Number(!active.has(a.id))-Number(!active.has(b.id))||String(a.branchLabel??'').localeCompare(String(b.branchLabel??''))||a.order-b.order);
 return renameProvidedChapterTitles({...project,chapters});
}
