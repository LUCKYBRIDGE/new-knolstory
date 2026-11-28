import {describe,it,expect} from 'vitest';
import type {StoryProject} from '@knolstory/story-domain';
import {representativeStories,classicStories,resolveProvidedCatalogStory,refineProvidedStory,enhanceExistingStory,getShortStoryOriginal,shortStoryOriginals} from '../src';
import packs from '../src/shortstory-originals-data.json';
import {polishCatalogNames} from '../src/catalog-name-polish';
import {connectCatalogPerspective} from '../src/catalog-perspective';
import {connectCatalogChapterIdentity} from '../src/catalog-chapter-identity';
import {connectCatalogNarrativeSeams} from '../src/catalog-narrative-seams';
import {connectCatalogBranchNarrative} from '../src/catalog-branch-narrative';
import {simplifyCatalogPerspectiveCard} from '../src/catalog-perspective-card';
import {connectCatalogLayeredScenes} from '../src/catalog-layered-scenes';
import {connectCatalogWeatherContinuity} from '../src/catalog-weather-continuity';
import {connectCatalogRainyCourtyard} from '../src/catalog-rainy-courtyard';
import {directOnggojibGhostExit} from '../src/catalog-ghost-exit';

const all=[...classicStories,...representativeStories];
const source=(id:string)=>all.find(entry=>entry.id===id)!.project;
// The edition published before the 2026-11-28 catalog names.
const published=(project:StoryProject)=>directOnggojibGhostExit(connectCatalogRainyCourtyard(connectCatalogWeatherContinuity(connectCatalogLayeredScenes(simplifyCatalogPerspectiveCard(connectCatalogBranchNarrative(connectCatalogNarrativeSeams(connectCatalogChapterIdentity(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(project)))))))))));
const titles=(id:string)=>resolveProvidedCatalogStory(source(id)).chapters.map(chapter=>chapter.title);
const named=(id:string,chapterId:string)=>resolveProvidedCatalogStory(source(id)).chapters.find(chapter=>chapter.id===chapterId)?.title;

describe('2026-11-28 catalog names of the four provided works',()=>{
 it('shows the reviewed work titles and subtitles in all eight story editions',()=>{
  const covers=Object.fromEntries(all.map(entry=>{const p=resolveProvidedCatalogStory(entry.project);return [entry.id,[p.title,p.cover?.subtitle]];}));
  expect(covers).toEqual({
   'rabbit-classic':['별주부전','또 다른 이름, 토끼전'],rabbit:['별주부전','용궁 속 지혜'],
   'onggojib-classic':['옹고집전','누가 이 집의 주인일까?'],onggojib:['옹고집전','대문 밖의 목소리'],
   'seonnyeo-classic':['선녀와 나무꾼','하늘과 땅 사이'],seonnyeo:['선녀와 나무꾼',''],
   'heungbu-classic':['흥부전','흥부와 놀부'],heungbu:['흥부와 놀부','서로의 몫'],
  });
  // The old subtitle's choice-story framing stays in the description shown with the book.
  expect(resolveProvidedCatalogStory(source('heungbu')).description).toContain('선택으로 생각해 보는');
 });

 it('renames the original editions’ chapters',()=>{
  expect(titles('rabbit-classic')).toEqual(['용궁에 닥친 근심','육지에서 만난 토끼','바닷속 용궁으로','용왕 앞의 토끼','파도 너머']);
  expect(titles('onggojib-classic')).toEqual(['닫힌 대문','곡식 한 줌','두 옹고집','누가 진짜인가','문밖의 밤','산길 끝에서']);
  expect(titles('seonnyeo-classic')).toEqual(['숲에서 만난 사슴','연못의 날개옷','사슴의 당부','구름을 바라보며','하늘에서 내려온 줄','용마를 타고']);
  expect(titles('heungbu-classic')).toEqual(['갈라진 살림','빈 쌀독','다친 제비','흥부가 박을 타다','놀부와 제비','놀부가 박을 타다','놀부의 집터']);
 });

 it('renames the knolstory chapters, including the 별주부전 생각해 보기 heading that repeats one',()=>{
  const rabbit=resolveProvidedCatalogStory(source('rabbit'));
  expect(rabbit.chapters.map(chapter=>chapter.title)).toEqual(['용궁 대청','용궁 잔치 이야기','도움을 청하다','바닷속 길','방석 하나','대청의 침묵','용왕의 눈길','육지 모래톱','돌아가지 않은 길','돌아온 자라']);
  const heading=rabbit.lines.find(line=>line.id==='review-main-002:ending-1:15')!.text;
  expect(heading.startsWith('「대청의 침묵」\n\n[생각해 보기]\n용왕에게 사실을 말한 자라는')).toBe(true);
  // 7장 keeps the names of the choice just taken, so its own headings are unchanged.
  expect(rabbit.lines.find(line=>line.id==='review-main-002:ending-2:14')!.text.startsWith('「돌아가지 않은 길」')).toBe(true);
  expect(rabbit.lines.find(line=>line.id==='review-main-002:ending-3:42')!.text.startsWith('「돌아온 자라」')).toBe(true);
  expect(titles('heungbu')).toEqual(['반쪽짜리 떡','곳간 앞의 두 형제','각자의 몫','겨울 문턱','빌린 곡식','빈손의 겨울','제비가 머문 집','박이 열리던 날','놀부의 방문','같아 보이는 방법','다른 박','뒤바뀐 문 앞','한 지붕 아래','두 집 사이의 길']);
 });

 it('names every carried-choice copy of a 옹고집전 scene, and its disconnected manuscript, alike',()=>{
  const onggojib=resolveProvidedCatalogStory(source('onggojib'));
  const byScene=new Map<string,Set<string>>();
  for(const chapter of onggojib.chapters){const scene=chapter.id.replace(/-cruelty-.+$/u,'');byScene.set(scene,new Set([...byScene.get(scene)??[],chapter.title]));}
  const expected:Record<string,string>={start:'겨울 저녁의 밥상',['part1-court']:'대문 앞 사내','real-route':'말 없는 밥상','fake-first-verdict':'아이들의 손','real-loop-testimony':'식은 국','fake-repeat-verdict':'부인의 한마디','fake-route':'눈길과 짚신','b-after-meal-days':'마당의 장작','b-vase-care':'일꾼의 삯','b-vase-stick':'갈라진 손등','b-before-confession-days':'화롯가의 저녁','b-final-acts':'늦은 밤의 손님'};
  for(const [scene,title] of Object.entries(expected))expect([...byScene.get('review-main-003:'+scene)!],scene).toEqual([title]);
  expect(onggojib.chapters.filter(chapter=>chapter.branchLabel==='미연결 원고').map(chapter=>chapter.title)).toEqual(['말 없는 밥상','아이들의 손','식은 국','부인의 한마디','눈길과 짚신']);
 });

 it('names every repeated 선녀와 나무꾼 scene alike while its choice question stays as written',()=>{
  const seonnyeo=resolveProvidedCatalogStory(source('seonnyeo'));
  const scene=(base:string)=>seonnyeo.chapters.filter(chapter=>chapter.id.replace(/-v\d+$/u,'')===base);
  const expected:Record<string,[string,number]>={'1':['빗속의 만남',1],'4':['산보다 더 위',2],'12':['장에 가는 날',4],C4:['날개옷을 어떻게 할까?',6],C5R:['선녀의 대답 앞에서',4],'E1-2':['보름달 아래',2],'E2-2':['새벽까지',4],'E4-1':['정말요?',2],'E1-4':['두 곳의 아침',1],'E2-4':['마당의 작은 싹',1],'E3-5':['비 내리는 마당',1],'E4-9':['장롱에 든 햇빛',1]};
  for(const [base,[title,count]] of Object.entries(expected)){const chapters=scene(base);expect(chapters,base).toHaveLength(count);expect(new Set(chapters.map(chapter=>chapter.title)),base).toEqual(new Set([title]));}
  expect(seonnyeo.lines.filter(line=>/^C4-v\d+-1$/u.test(line.id)).every(line=>line.text==='선녀옷을 어떻게 할까?')).toBe(true);
  expect(seonnyeo.chapters.filter(chapter=>chapter.title==='나무꾼의 등장'||chapter.title==='영원히 닫힌 문')).toHaveLength(0);
 });

 it('changes names only: IDs, numbering, branches, links, cuts and text stay those of the published edition',()=>{
  for(const entry of all){
   const before=published(entry.project),after=resolveProvidedCatalogStory(entry.project);
   const strip=(p:StoryProject)=>({...p,title:'',cover:p.cover&&{...p.cover,subtitle:''},chapters:p.chapters.map(chapter=>({...chapter,title:''})),lines:p.lines.map(line=>line.id==='review-main-002:ending-1:15'?{...line,text:''}:line)});
   expect(strip(after),entry.id).toEqual(strip(before));
   expect(after).toEqual(polishCatalogNames(before));
  }
 });

 it('refreshes a saved published edition but keeps a work the reader renamed or edited',()=>{
  for(const entry of all){
   const saved=published(entry.project),snapshot=structuredClone(saved),current=resolveProvidedCatalogStory(entry.project);
   expect(resolveProvidedCatalogStory(entry.project,saved),entry.id).toEqual(current);expect(saved).toEqual(snapshot);
   expect(resolveProvidedCatalogStory(entry.project,current)).toEqual(current);
   for(const edited of [{...saved,title:'내가 고친 제목'},{...saved,chapters:saved.chapters.map((chapter,i)=>i?chapter:{...chapter,title:'내가 고친 장'})},{...saved,lines:saved.lines.map((line,i)=>i?line:{...line,text:line.text+' 내가 쓴 글'})}])
    expect(resolveProvidedCatalogStory(entry.project,edited)).toBe(edited);
   const personal={...saved,id:'personal:'+saved.id};expect(polishCatalogNames(personal)).toBe(personal);
  }
 });
});

describe('2026-11-28 shortstory page names',()=>{
 const pages=(key:typeof shortStoryOriginals[number]['key'])=>getShortStoryOriginal(key).pages.map(page=>page.title);
 it('shows the reviewed page names in all four picture books',()=>{
  expect(shortStoryOriginals.map(book=>book.title)).toEqual(['별주부전','옹고집전','선녀와 나무꾼','흥부와 놀부']);
  expect(pages('rabbit')).toEqual(['용궁의 근심','낯선 육지','달콤한 초대','바다를 건너','뜻밖의 위기','토끼의 한마디','물가에서','숲과 물가']);
  expect(pages('onggojib')).toEqual(['닫힌 대문','대문 앞의 승려','도승의 손길','두 옹고집의 다툼','관아의 판결','추운 문밖에서','도승이 건넨 부적','열린 대문']);
  expect(pages('seonnyeo')).toEqual(['사슴을 숨겨 주다','연못의 날개옷','낯선 산골집','두 아이와 날개옷','구름 아래 마당','두레박을 타고','구름 위의 집','땅으로 가는 용마','말 위의 호박죽','하늘을 향한 울음']);
  expect(pages('heungbu')).toEqual(['대문 밖의 가족','비어 있는 그릇','다친 제비','돌아온 제비','박을 타는 날','놀부와 제비','놀부의 박','형을 찾아서']);
 });
 it('keeps the preserved pack and every page ID, text and illustration',()=>{
  for(const pack of packs){
   const book=getShortStoryOriginal(pack.worldId as typeof shortStoryOriginals[number]['key']);
   expect(book.pages.map(page=>[page.id,page.text,page.backgroundId])).toEqual(pack.scenes.map(scene=>[scene.sourceSceneId,scene.referenceText,scene.art.assetId]));
  }
  expect(packs.find(pack=>pack.worldId==='rabbit')!.scenes[5].title).toBe('위기를 뒤집는 꾀');
 });
});
