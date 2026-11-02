import {it,expect} from 'vitest';
import {representativeStories,refineProvidedStory,enhanceExistingStory,resolveProvidedCatalogStory} from '../src';
import {connectCatalogPerspective} from '../src/catalog-perspective';
import {connectCatalogChapterIdentity} from '../src/catalog-chapter-identity';
import {connectCatalogNarrativeSeams} from '../src/catalog-narrative-seams';
import {connectCatalogBranchNarrative} from '../src/catalog-branch-narrative';
import {simplifyCatalogPerspectiveCard} from '../src/catalog-perspective-card';
import {connectCatalogLayeredScenes} from '../src/catalog-layered-scenes';
const source=representativeStories.find(e=>e.id==='seonnyeo')!.project;
const previous=()=>connectCatalogLayeredScenes(simplifyCatalogPerspectiveCard(connectCatalogBranchNarrative(connectCatalogNarrativeSeams(connectCatalogChapterIdentity(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(source))))))));
it('upgrades an exact previously published layered edition but never an edited manuscript',()=>{
 const old=previous(),before=structuredClone(old),current=resolveProvidedCatalogStory(source,old);
 expect(current.lines.find(l=>l.id==='C1-B-v161-1')?.backgroundId).toBe('seonnyeo.background.BG02-valley-storm');
 expect(old).toEqual(before);expect(resolveProvidedCatalogStory(source,current)).toEqual(current);
 const changed={...old,lines:old.lines.map(l=>l.id==='C1-B-v161-1'?{...l,text:l.text+' 내가 쓴 글'}:l)};
 expect(resolveProvidedCatalogStory(source,changed)).toBe(changed);
 expect(resolveProvidedCatalogStory(source,{...old,title:'나의 판본'}).title).toBe('나의 판본');
});
it('leaves the whole published manuscript identical apart from reviewed background references',()=>{
 const old=previous(),current=resolveProvidedCatalogStory(source);
 expect({...current,lines:current.lines.map((line,i)=>({...line,backgroundId:old.lines[i].backgroundId}))}).toEqual(old);
});
