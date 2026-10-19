import {it,expect} from 'vitest';
import {createStoryDocument,parseStoryDocument,CURRENT_SCHEMA_VERSION} from '@knolstory/story-domain';
import {getRepresentativeStory} from '../src';
it('declares scoring as document schema6 while reading unchanged Next5 meaning',()=>{
 const old={...getRepresentativeStory('rabbit'),schemaVersion:5};
 const loaded=parseStoryDocument(old);expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error('kind');
 expect(loaded.document.schemaVersion).toBe(8);expect(loaded.document.project).toEqual(old.project);expect(CURRENT_SCHEMA_VERSION).toBe(8);
 const document=createStoryDocument({project:{...old.project,scores:[{id:'trust',name:'신뢰',description:'선택으로 쌓이는 신뢰',initial:0}]},savedAt:old.savedAt,appVersion:old.appVersion});expect(document.schemaVersion).toBe(8);
 expect(parseStoryDocument({...document,schemaVersion:5}).ok).toBe(false);
});
