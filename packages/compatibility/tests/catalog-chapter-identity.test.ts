import {currentCatalogVisuals} from './current-catalog-visuals';
import {simplifyCatalogPerspectiveCard as previousCard} from '../src/catalog-perspective-card';
import {connectCatalogLayeredScenes} from '../src/catalog-layered-scenes';
const simplifyCatalogPerspectiveCard=(p:Parameters<typeof previousCard>[0])=>currentCatalogVisuals(previousCard(p));
import {connectCatalogBranchNarrative} from '../src/catalog-branch-narrative';
import {connectCatalogNarrativeSeams} from '../src/catalog-narrative-seams';
import {expect,it} from 'vitest';
import {representativeStories,classicStories,resolveProvidedCatalogStory,refineProvidedStory,enhanceExistingStory} from '../src';
import {connectCatalogPerspective} from '../src/catalog-perspective';
import {chapterLabel,orderedStoryFlowLines,storyFlowTargets,type StoryProject} from '@knolstory/story-domain';
function edges(project:StoryProject){const lines=orderedStoryFlowLines(project);return lines.map((line,i)=>({id:line.id,chapterId:line.chapterId,targets:storyFlowTargets(lines,i)}));}
for(const entry of [...representativeStories,...classicStories])it(`${entry.id}: narrative chapter labels never go backwards along actual reading links`,()=>{
 const original=entry.project,current=resolveProvidedCatalogStory(original),chapters=new Map(current.chapters.map(c=>[c.id,c])),lines=new Map(current.lines.map(l=>[l.id,l]));
 for(const source of edges(current))for(const target of source.targets){const line=target?lines.get(target):undefined;if(!line||line.chapterId===source.chapterId)continue;const from=chapters.get(source.chapterId)!,to=chapters.get(line.chapterId)!;expect(to.chapterNumber??to.order,`${chapterLabel(from)} → ${chapterLabel(to)}`).toBeGreaterThan(from.chapterNumber??from.order);}
 expect(edges(current)).toEqual(edges(original));
});
it('labels sibling branches at the same narrative stage and sorts the displayed chapter list',()=>{
 const heungbu=resolveProvidedCatalogStory(representativeStories.find(s=>s.id==='heungbu')!.project),rabbit=resolveProvidedCatalogStory(representativeStories.find(s=>s.id==='rabbit')!.project);
 expect(heungbu.chapters.filter(c=>c.chapterNumber===5).map(c=>chapterLabel(c))).toEqual(['5장A · 빌린 곡식','5장B · 빈손의 겨울']);
 expect(heungbu.chapters.find(c=>c.id==='chapter-6')?.chapterNumber).toBe(6);
 expect(rabbit.chapters.filter(c=>c.chapterNumber===2)).toHaveLength(2);
 for(const entry of representativeStories){const p=resolveProvidedCatalogStory(entry.project);const numbers=p.chapters.map(c=>c.chapterNumber);expect(numbers.every(Number.isSafeInteger)).toBe(true);expect(numbers).toEqual([...numbers].sort((a,b)=>a!-b!));}
});
it('keeps disconnected Onggojib manuscripts explicitly marked and every original cut intact',()=>{
 const original=representativeStories.find(s=>s.id==='onggojib')!.project,p=resolveProvidedCatalogStory(original);expect(p.chapters.filter(c=>c.branchLabel==='미연결 원고')).toHaveLength(5);expect(p.lines).toHaveLength(original.lines.length);
 expect(p.chapters.filter(c=>c.branchLabel==='미연결 원고').every(c=>chapterLabel(c).includes(' · 미연결 원고 · '))).toBe(true);
 expect(p.chapters.filter(c=>c.title==='돌아온 뒤')).toHaveLength(0);
});
it('keeps originals unchanged and does not rewrite any personally edited chapter',()=>{
 for(const entry of classicStories)expect(resolveProvidedCatalogStory(entry.project).chapters).toEqual(connectCatalogLayeredScenes(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(entry.project)))).chapters);
 for(const entry of representativeStories){const current=resolveProvidedCatalogStory(entry.project);const edited={...current,chapters:current.chapters.map((c,i)=>i?c:{...c,chapterNumber:77,title:'내가 고친 장'})};expect(resolveProvidedCatalogStory(entry.project,edited)).toBe(edited);}
});
it('changes chapter presentation only: preserves every cut, runtime order and all other authored fields',()=>{
 for(const entry of representativeStories){const before=simplifyCatalogPerspectiveCard(connectCatalogBranchNarrative(connectCatalogNarrativeSeams(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(entry.project)))))),after=resolveProvidedCatalogStory(entry.project);expect(after.lines).toEqual(before.lines);expect({...after,chapters:before.chapters}).toEqual(before);const strip=(p:StoryProject)=>p.chapters.map(({chapterNumber:_n,branchLabel:_b,title:_t,...chapter})=>chapter).sort((a,b)=>a.id.localeCompare(b.id));expect(strip(after)).toEqual(strip(before));}
});
