import {it,expect} from 'vitest';
import {representativeStories,classicStories,resolveProvidedCatalogStory} from '../src';
it('shows only the viewpoint title on all six official cards while preserving authored descriptions',()=>{
 const p=representativeStories.find(s=>s.id==='onggojib')!.project,current=resolveProvidedCatalogStory(p);
 const cues=current.lines.filter(l=>l.presentation?.transition?.type==='perspective-blackout');expect(cues).toHaveLength(6);
 for(const line of cues){expect(line.presentation!.transition!.cue).toBeUndefined();expect(line.presentation!.transition!.description).toBeUndefined();expect(line.presentation!.transition!.title).toBe(line.text);}
 const descriptionOnly={...current,lines:current.lines.map(l=>l.presentation?.transition?.title==='부인의 시점'?{...l,presentation:{...l.presentation,transition:{...l.presentation.transition,description:'내가 쓴 설명'}}}:l)};expect(resolveProvidedCatalogStory(p,descriptionOnly)).toBe(descriptionOnly);
 const personal={...current,title:current.title+' 내 원고',lines:current.lines.map((l,i)=>i?l:{...l,presentation:{...l.presentation,transition:{...l.presentation!.transition!,description:'내가 쓴 설명'}}})};expect(resolveProvidedCatalogStory(p,personal)).toBe(personal);
 for(const entry of [...representativeStories,...classicStories].filter(s=>s.id!=='onggojib'))expect(resolveProvidedCatalogStory(entry.project).lines.filter(l=>l.presentation?.transition?.type==='perspective-blackout')).toHaveLength(0);
});
