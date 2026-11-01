import {simplifyCatalogPerspectiveCard} from '../src/catalog-perspective-card';
import {connectCatalogNarrativeSeams} from '../src/catalog-narrative-seams';
import {connectCatalogBranchNarrative} from '../src/catalog-branch-narrative';
import {expect,it} from 'vitest';
import {representativeStories,refineProvidedStory,enhanceExistingStory,resolveProvidedCatalogStory,createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,exportAuthoringExcel,importAuthoringExcel} from '../src';
import {connectCatalogPerspective} from '../src/catalog-perspective';
import {connectCatalogChapterIdentity} from '../src/catalog-chapter-identity';
it('repairs exactly three automatic narration seams, preserves every route and refreshes the last official chapter edition',async()=>{
 const original=representativeStories.find(s=>s.id==='onggojib')!.project,previous=connectCatalogChapterIdentity(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(original)))),current=connectCatalogNarrativeSeams(previous);
 expect(resolveProvidedCatalogStory(original,previous)).toEqual(simplifyCatalogPerspectiveCard(connectCatalogBranchNarrative(current)));
 const changed=current.lines.filter((l,i)=>l.text!==previous.lines[i].text);expect(changed).toHaveLength(3);for(const line of changed){expect(line.text).toBe('부인은 아이를 감싸 준 옹고집을 바라보았다.');expect(line.flow?.type).toBe('goto');}
 expect({...current,lines:current.lines.map((l,i)=>({...l,text:previous.lines[i].text}))}).toEqual(previous);
 const edited={...previous,lines:previous.lines.map((l,i)=>i?l:{...l,text:l.text+' 내가 쓴 글'})};expect(resolveProvidedCatalogStory(original,edited)).toBe(edited);
 const document={documentType:'story-maker-project' as const,schemaVersion:8 as const,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project:current},archive=await createAuthoringArchive({format:'knolstory',document});expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
},30000);
it('keeps the fairy decision on the evening she requested, without altering any choice or consequence',()=>{
 const original=representativeStories.find(s=>s.id==='seonnyeo')!.project,previous=connectCatalogChapterIdentity(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(original)))),current=connectCatalogNarrativeSeams(previous);
 expect(resolveProvidedCatalogStory(original,previous)).toEqual(simplifyCatalogPerspectiveCard(connectCatalogBranchNarrative(current)));
 const changed=current.lines.filter((l,i)=>l.text!==previous.lines[i].text);expect(changed).toHaveLength(1);expect(changed[0]).toMatchObject({id:'E4-7-v36-1',text:'그날 저녁, 어젯밤보다 조금 더 이지러진 달이 뜬다.'});expect({...current,lines:current.lines.map((l,i)=>({...l,text:previous.lines[i].text}))}).toEqual(previous);expect(previous.lines.find(l=>l.id==='E4-6-v37-5')?.text).toContain('오늘 밤까지');
});
