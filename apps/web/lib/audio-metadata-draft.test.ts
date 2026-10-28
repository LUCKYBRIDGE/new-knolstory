import {describe,it,expect} from 'vitest';
import {reconcileAudioMetadataDraft,acknowledgeAudioMetadataSave} from './audio-metadata-draft';
describe('shared audio metadata draft refresh',()=>{
 const baseline={name:'원래 이름',category:'effect' as const,tags:'종',originalName:'bell.wav',source:'직접 녹음'};
 it('refreshes pristine fields while retaining unsaved edits',()=>{
  const draft={...baseline,tags:'학교, 종',source:''},next={...baseline,name:'새 한글 이름',tags:'외부 속성',source:'새 출처'};
  expect(reconcileAudioMetadataDraft({baseline,draft},next)).toEqual({baseline:next,draft:{...next,tags:'학교, 종',source:''}});expect(baseline.name).toBe('원래 이름');expect(draft.name).toBe('원래 이름');
 });
 it('uses refreshed baseline for later updates and preserves same-field conflicts',()=>{
  const pending={baseline,draft:{...baseline,name:'작성 중 이름'}};const first=reconcileAudioMetadataDraft(pending,{...baseline,name:'외부 이름'}),second=reconcileAudioMetadataDraft(first,{...baseline,name:'외부 이름2',category:'ambience'});expect(second.draft).toEqual({...baseline,name:'작성 중 이름',category:'ambience'});
 });
});
describe('saved normalized metadata',()=>{
 const baseline={name:'이름',category:'effect' as const,tags:'종',originalName:'bell.wav',source:'직접 녹음'};
 it('marks a normalized successful save clean',()=>{
  const submitted={...baseline,name:' 이름 ',tags:'학교,종'},canonical={...baseline,tags:'학교, 종'};
  const saved=acknowledgeAudioMetadataSave({baseline,draft:submitted},submitted,canonical);
  expect(saved).toEqual({baseline:canonical,draft:canonical});expect(reconcileAudioMetadataDraft(saved,{...canonical,tags:'새 속성'}).draft.tags).toBe('새 속성');
 });
 it('keeps edits made while saving and refreshes unchanged fields',()=>{
  const submitted={...baseline,name:'저장한 이름'},canonical={...submitted,tags:'새 종'},draft={...submitted,name:'기다리며 고친 이름',category:'ambience' as const,tags:'기다리며 고친 속성',originalName:'새 파일.wav',source:''};
  expect(acknowledgeAudioMetadataSave({baseline,draft},submitted,canonical)).toEqual({baseline:canonical,draft});
 });
});

describe('audio draft departure markers',()=>{
 it('stays dirty for a select-only change and clears after acknowledgement',()=>{
  const baseline={name:'소리',category:'effect' as const,tags:'종',originalName:'bell.wav',source:'녹음'};
  const draft={...baseline,category:'ambience' as const};
  expect(JSON.stringify(draft)!==JSON.stringify(baseline)).toBe(true);
  const saved=acknowledgeAudioMetadataSave({baseline,draft},draft,draft);
  expect(saved.draft).toEqual(saved.baseline);
 });
});
