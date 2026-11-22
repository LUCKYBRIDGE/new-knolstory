import {resolveAsset,resolveAudioAsset} from '@knolstory/asset-registry';
import type {StoryProject} from '@knolstory/story-domain';
import {referencedAudioIds} from './audio-portability';

/** One credited name, with an optional small line under it (maker · licence, rights holder). */
export type CreditLine=Readonly<{text:string;detail?:string}>;
/** One block of the closing credits, in reading order. */
export type CreditSection=Readonly<{heading:string;lines:readonly CreditLine[]}>;
export type StoryCredits=Readonly<{title:string;author:string;sections:readonly CreditSection[];note:string;endingCount:number}>;

/**
 * Closing credits come from the work itself, so a student never has to fill them in:
 * who wrote it, who speaks in it, and where every picture and sound came from (the attribution the media needs anyway).
 */
export function buildStoryCredits(project:StoryProject):StoryCredits{
 const author=(project.cover?.author||'').trim();
 const sections:CreditSection[]=[];
 // Cast: the registered characters, or — for works that never registered any — the speakers in order of appearance.
 const registered=(project.characters??[]).map(character=>character.name.trim()).filter(Boolean);
 const speakers=[...project.lines].filter(line=>line.type==='dialogue').map(line=>line.speakerName.trim()).filter(Boolean);
 const cast=unique(registered.length?registered:speakers);
 if(cast.length)sections.push({heading:'등장인물',lines:cast.map(text=>({text}))});
 // Pictures: grouped by their rights holder; anything outside the catalog was added by the author.
 const imageIds=new Set<string>();
 const add=(id?:string)=>{if(id)imageIds.add(id);};
 add(project.stageDefaults?.backgroundId);add(project.stageDefaults?.leftAssetId);add(project.stageDefaults?.rightAssetId);
 for(const chapter of project.chapters){add(chapter.backgroundId);add(chapter.leftAssetId);add(chapter.rightAssetId);}
 for(const line of project.lines){
  if(line.backgroundMode!=='none')add(line.backgroundId);
  for(const actor of [...(line.stageComposition?.leftActors??[]),...(line.stageComposition?.rightActors??[])])add(actor.assetId);
 }
 const holders=new Map<string,number>();let own=0;
 for(const id of imageIds){const asset=resolveAsset(id);if(!asset){own++;continue;}const holder=((asset as {copyright?:string}).copyright||'').trim()||'놀퀴즈';holders.set(holder,(holders.get(holder)??0)+1);}
 const pictures:CreditLine[]=[...holders].map(([holder,count])=>({text:`기본 제공 그림 ${count}점`,detail:`© ${holder}`}));
 if(own)pictures.push({text:`직접 넣은 그림 ${own}점`});
 if(pictures.length)sections.push({heading:'그림',lines:pictures});
 // Sounds: music apart from effects, each with its maker and licence, as its source asks.
 const music:CreditLine[]=[],effects:CreditLine[]=[];let ownSounds=0;const seen=new Set<string>();
 for(const id of referencedAudioIds(project)){
  if(seen.has(id))continue;seen.add(id);
  const asset=resolveAudioAsset(id);if(!asset){ownSounds++;continue;}
  const origin=asset.origin;(asset.kind==='music'?music:effects).push({text:asset.name,detail:origin?`${origin.author} · ${origin.license}`:'놀퀴즈'});
 }
 if(music.length)sections.push({heading:'음악',lines:music});
 if(effects.length)sections.push({heading:'효과음',lines:effects});
 if(ownSounds)sections.push({heading:'소리',lines:[{text:`직접 넣은 소리 ${ownSounds}개`}]});
 // Named endings, so a branching story can say how many there are to find.
 const endingCount=new Set(project.lines.filter(line=>line.ending?.endsStory&&line.ending.name.trim()).map(line=>line.ending!.name.trim())).size;
 return {title:project.title.trim()||'제목 없는 이야기',author,sections,note:(project.cover?.authorNote||'').trim(),endingCount};
}

function unique(values:readonly string[]):string[]{return [...new Set(values)];}
