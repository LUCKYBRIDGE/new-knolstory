import {describe,it,expect} from 'vitest';
import {representativeStories} from '@knolstory/compatibility';
import {patchStoryLine} from '../src/index';
describe('non-stage edits preserve authored composition fields',()=>{
 const project=representativeStories[0]!.project,line=project.lines[0]!;
 const {inheritActors:_inherit,...withoutFlag}=line;
 const source={...project,lines:project.lines.map(item=>item.id===line.id?withoutFlag:item)};
 for(const patch of [{text:'수정한 글'},{presentation:{effects:[{type:'shake' as const}]}},{flow:{type:'goto' as const,targetLineId:null}}])it(`does not insert inheritance defaults for ${Object.keys(patch)[0]}`,()=>{
  const next=patchStoryLine(source,line.id,patch),edited=next.lines.find(item=>item.id===line.id)!;
  expect(JSON.parse(JSON.stringify(edited))).toEqual(JSON.parse(JSON.stringify({...withoutFlag,...patch})));
  expect(source.lines[0]).toEqual(withoutFlag);
 });
});
