import {it,expect} from 'vitest';
import approvals from '../src/audio-service-approvals.json';
import stagedAudio from '../src/staged-cc0-audio.json';
import {AUDIO_CATALOG,searchAudioAssets,resolveAudioAsset,EXCLUDED_AUDIO_ASSETS,resolveExcludedAudioAsset} from '../src';
it('provisions exactly approved CC0 and conditional scene audio with item-level source evidence',()=>{
 const stagedIds=new Set(stagedAudio.map(asset=>asset.id));
 const originalApprovalIds=approvals.assets.map(asset=>asset.id).filter(id=>!stagedIds.has(id));
 expect(AUDIO_CATALOG).toHaveLength(530);
 expect(originalApprovalIds).toHaveLength(61);
 expect(AUDIO_CATALOG.map(a=>a.id).sort()).toEqual(approvals.assets.map(a=>a.id).sort());
 for(const asset of AUDIO_CATALOG){
  const approved=approvals.assets.find(a=>a.id===asset.id)!;
  expect(approved.src).toBe(asset.src);
  expect(asset.origin?.license).toBe(approved.license);expect(asset.origin?.commercialUse).toBe('permitted');expect(asset.origin?.author).toBeTruthy();
  expect(asset.usagePolicy).toMatchObject({license:approved.license,sourceUrl:approved.sourceUrl,sha256:approved.sha256,exportMode:'reference',commercialUse:'permitted'});
  expect(resolveAudioAsset(asset.id)).toBe(asset);
 }
 const originalCatalog=AUDIO_CATALOG.filter(a=>originalApprovalIds.includes(a.id));expect(originalCatalog).toHaveLength(61);
 const cc0=originalCatalog.filter(a=>a.usagePolicy?.usage==='unrestricted');expect(cc0).toHaveLength(47);
 for(const asset of cc0) expect(asset.usagePolicy).toMatchObject({license:'CC0-1.0',redistribution:'permitted',editorProvision:'permitted',standaloneDownload:'permitted',preview:'asset'});
 const conditional=originalCatalog.filter(a=>a.usagePolicy?.usage==='scene-integrated');expect(conditional).toHaveLength(14);
 for(const asset of conditional){
  expect(asset.name).toMatch(/[가-힣]/);expect(asset.metadata?.source).toBe('Pixabay');expect(asset.metadata?.originalName).toBeTruthy();
  expect(asset.origin?.url).toBe(asset.usagePolicy?.sourceUrl);expect(asset.origin?.termsUrl).toContain('pixabay.com');
  expect(asset.usagePolicy).toMatchObject({license:'Pixabay Content License',redistribution:'restricted',editorProvision:'scene-integrated',standaloneDownload:'prohibited',preview:'scene'});
 }
 expect(EXCLUDED_AUDIO_ASSETS).toEqual([]);expect(resolveExcludedAudioAsset('missing')).toBeUndefined();
 expect(searchAudioAssets(AUDIO_CATALOG,'sound','','effect',{source:'Pixabay'})).toHaveLength(7);
 // Provider labels describe provenance; permission comes from the approval record.
 const custom={...AUDIO_CATALOG[0],usagePolicy:undefined,id:`audio:custom:${'a'.repeat(64)}:wav`,source:'Pixabay'};
 expect(searchAudioAssets([custom],'music','',undefined,{source:'Pixabay'})).toEqual([custom]);expect(custom.usagePolicy).toBeUndefined();
});
