import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseStoryDocument} from '@knolstory/story-domain';
import {compileStoryScene,createPlayback,advancePlayback} from '../src';
it('the delivered branching file contains valid document, real portable audio bytes and playable endings',()=>{
 const raw=JSON.parse(readFileSync('docs/architecture/evidence/responsive-audio/branching-demo.knolstory','utf8'));
 const result=parseStoryDocument(raw);expect(result.ok).toBe(true);if(!result.ok)return;
 for(const resource of raw.audioResources)expect(resource.id).toBe(`audio:custom:${createHash('sha256').update(Buffer.from(resource.data,'base64')).digest('hex')}:wav`);
 const project=result.document.project;
 for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}])for(const line of project.lines)expect(compileStoryScene(project,line.id,1,{mode:'play',viewport}).actors.length).toBeLessThanOrEqual(2);
 for(const option of ['light','night']) {
  let state=createPlayback(project);for(let i=0;i<3;i++)state=advancePlayback(project,state);
  state=advancePlayback(project,state,option);expect(state.lineId).toBe(`end-${option}`);
  expect(advancePlayback(project,state).status).toBe('ended');
 }
});
