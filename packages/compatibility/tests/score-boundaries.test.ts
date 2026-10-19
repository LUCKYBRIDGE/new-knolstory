import {it,expect} from 'vitest';
import {parseStoryDocument,isStoryScoreCondition} from '@knolstory/story-domain';
import {getRepresentativeStory} from '../src';
for(const project of [{lines:{}},{lines:[{flow:{options:{}}}]}])it('malformed earlier documents report validation issues instead of throwing during score version detection',()=>{
 const old={...getRepresentativeStory('rabbit'),schemaVersion:5,project};expect(()=>parseStoryDocument(old)).not.toThrow();expect(parseStoryDocument(old).ok).toBe(false);
});
it('score operators require a real string without coercing array input',()=>{expect(isStoryScoreCondition({mode:'all',terms:[{scoreId:'trust',operator:['gte'],value:2}]})).toBe(false);});
