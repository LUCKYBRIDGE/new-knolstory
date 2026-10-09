import {describe,it,expect} from 'vitest';
import {actorLabel} from './actor-label';
describe('authoring actor labels',()=>{
 it('identifies the side and order without exposing saved keys',()=>{
  const stage={leftActors:[{key:'private-uuid',assetId:'asset'},{key:'legacy-L2',assetId:'asset'}],rightActors:[{key:'R1',assetId:'asset'}]};
  expect(actorLabel(stage,'private-uuid')).toBe('왼쪽 1번 인물');expect(actorLabel(stage,'legacy-L2')).toBe('왼쪽 2번 인물');expect(actorLabel(stage,'R1')).toBe('오른쪽 1번 인물');expect(actorLabel(stage,'missing')).toBe('인물');
 });
});
