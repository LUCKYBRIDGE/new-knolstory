import {it,expect} from 'vitest';
import {representativeStories,resolveProvidedCatalogStory,refineProvidedStory,enhanceExistingStory} from '../src';
import {connectCatalogPerspective} from '../src/catalog-perspective';
import {connectCatalogChapterIdentity} from '../src/catalog-chapter-identity';
import {connectCatalogNarrativeSeams} from '../src/catalog-narrative-seams';
import {connectCatalogBranchNarrative} from '../src/catalog-branch-narrative';
import {simplifyCatalogPerspectiveCard} from '../src/catalog-perspective-card';
import {connectCatalogLayeredScenes} from '../src/catalog-layered-scenes';
import {connectCatalogWeatherContinuity} from '../src/catalog-weather-continuity';
const source=representativeStories.find(e=>e.id==='seonnyeo')!.project;
const prior=()=>connectCatalogWeatherContinuity(connectCatalogLayeredScenes(simplifyCatalogPerspectiveCard(connectCatalogBranchNarrative(connectCatalogNarrativeSeams(connectCatalogChapterIdentity(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(source)))))))));
it('uses the same empty cottage in rainy evening only for the five actual reunion cuts',()=>{
 const previous=prior(),current=resolveProvidedCatalogStory(source,previous),changed=current.lines.filter((l,i)=>l.backgroundId!==previous.lines[i].backgroundId);
 expect(changed.map(l=>l.id)).toEqual([3,4,5,6,7].map(n=>'E3-5-v23-'+n));
 expect(changed.every(l=>l.backgroundId==='seonnyeo.background.cottage-rain-evening-v1')).toBe(true);
 expect({...current,lines:current.lines.map((l,i)=>({...l,backgroundId:previous.lines[i].backgroundId}))}).toEqual(previous);
 for(const n of [1,2])expect(current.lines.find(l=>l.id==='E3-5-v23-'+n)).toEqual(previous.lines.find(l=>l.id==='E3-5-v23-'+n));
});
it('upgrades an exact published233weather edition while protecting any personal edit',()=>{
 const previous=prior(),snapshot=structuredClone(previous);expect(resolveProvidedCatalogStory(source,previous)).not.toEqual(previous);expect(previous).toEqual(snapshot);
 for(const edited of [{...previous,title:'내 원고'}, {...previous,id:'personal-cottage'}, {...previous,lines:previous.lines.map(l=>l.id==='E3-5-v23-3'?{...l,text:l.text+' 추가 글'}:l)}])expect(resolveProvidedCatalogStory(source,edited)).toBe(edited);
});
