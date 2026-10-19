import type {StoryProject} from '@knolstory/story-domain';
import {coverElementText,resolveBookCover} from './book-cover';
export type BookEdition='original'|'knolstory'|'own'|'imported';
export const BOOK_EDITION_LABELS:Record<BookEdition,string>={original:'원작',knolstory:'놀스토리',own:'내 작품',imported:'가져온 작품'};
/** Match front-cover text rendering order, including authored custom and band copy. */
export function shelfCoverAccessibleLabel(title:string,project:StoryProject,edition:BookEdition):string{
 const model=resolveBookCover(project,'front'),{cover}=model;
 let parts:string[];
 if(cover.design){
  const main=model.elements.filter(item=>item.type==='text'&&item.region!=='band');
  const band=model.elements.filter(item=>item.type==='text'&&item.region==='band');
  parts=[...main,...band].flatMap(item=>item.type==='text'?[coverElementText(item,model.context)]:[]);
 }else{
  parts=[...(!cover.composition||cover.composition.showEdition?[BOOK_EDITION_LABELS[edition]]:[]),cover.subtitle,model.title,...(cover.author?[`${cover.author} 지음`]:[])];
 }
 const visible=parts.join(' ').replace(/\s+/g,' ').trim();
 return `${title} 책 표지와 소개 보기${visible?` · ${visible}`:''}`;
}
