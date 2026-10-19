import {ASSET_CATALOG} from '../src/index';
import {describe,it,expect,vi} from 'vitest';
import {assertCatalogOnlyMedia} from '../src/catalog-media-policy';
describe('catalog-only authoring import',()=>{
 it('allows registered references and authored notes',()=>expect(()=>assertCatalogOnlyMedia({project:{lines:[{audio:{music:{assetId:'audio:music:forest'}}}],planning:{freeNotes:'https://example.com/image.png'}}})).not.toThrow());
 it('rejects external audio attachments even when unused',()=>expect(()=>assertCatalogOnlyMedia({audioResources:[{id:'audio:custom:hash:wav'}]})).toThrow('외부'));
 it('rejects custom audio and external image references',()=>{expect(()=>assertCatalogOnlyMedia({project:{audio:{assetId:'audio:custom:hash:wav'}}})).toThrow('외부');expect(()=>assertCatalogOnlyMedia({project:{cover:{backgroundId:'https://example.com/image.png'}}})).toThrow('외부');});
});
it('rejects unknown unused chapter media without interpreting manuscript URLs',()=>{
 expect(()=>assertCatalogOnlyMedia({project:{chapters:[{backgroundAssetIds:['unregistered-background']}],lines:[{text:'https://example.com/그림'}]}})).toThrow('등록된 자료');
});
it('rejects unregistered character defaults and wrong image kinds',()=>{
 expect(()=>assertCatalogOnlyMedia({project:{characters:[{defaultImageId:'outside-character'}]}})).toThrow('등록된 자료');
 expect(()=>assertCatalogOnlyMedia({project:{stageDefaults:{backgroundId:ASSET_CATALOG.find(item=>item.type==='character')!.id}}})).toThrow('등록된 자료');
});
it('does not interpret memo fields named assetId or characterId as media',()=>{
 expect(()=>assertCatalogOnlyMedia({project:{creativeMemos:[{fields:[{assetId:'a note value',characterId:'my character'}]}],planning:{assetId:'https://example.com'}}})).not.toThrow();
});
it('covers actors unused resources and designed cover elements',()=>{
 const background=ASSET_CATALOG.find(item=>item.type==='background')!.id,character=ASSET_CATALOG.find(item=>item.type==='character')!.id;
 const project={stageDefaults:{backgroundId:background,leftAssetId:character},characters:[{defaultImageId:character}],chapters:[{characterAssetIds:[character],backgroundAssetIds:[background],audio:{sounds:[{assetId:'audio:sound:chime'}]}}],lines:[{stageComposition:{leftActors:[{assetId:character}],rightActors:[]}}],cover:{backgroundId:background,characterId:character,design:{faces:{front:{elements:[{type:'image',assetType:'background',assetId:background},{type:'text',text:'https://example.com'}]}}}}};
 expect(()=>assertCatalogOnlyMedia({project})).not.toThrow();
 expect(()=>assertCatalogOnlyMedia({project:{lines:[{stageComposition:{rightActors:[{assetId:'unknown-actor'}]}}]}})).toThrow('외부');
 expect(()=>assertCatalogOnlyMedia({project:{cover:{design:{faces:{back:{elements:[{type:'image',assetType:'background',assetId:'unknown-cover'}]}}}}}})).toThrow('외부');
});
it('uses the canonical public export without a Web dependency',async()=>{
 const registry=await import('../src/index');expect(registry.assertCatalogOnlyMedia).toBe(assertCatalogOnlyMedia);
});
it('accepts every supported project envelope and empty image sentinel without changing prose',()=>{
 const project={stageDefaults:{backgroundId:'__none',leftAssetId:'',rightAssetId:undefined},lines:[{text:'https://example.com',memo:{assetId:'outside'}}]};
 const before=JSON.stringify(project);
 for(const value of [project,{project},{document:{project}}])expect(()=>assertCatalogOnlyMedia(value)).not.toThrow();
 expect(JSON.stringify(project)).toBe(before);
 for(const value of [undefined,null,[],{},false])expect(()=>assertCatalogOnlyMedia(value)).not.toThrow();
});
it('rejects nonstring media IDs and checks ambience and sound cues',()=>{
 for(const project of [
  {stageDefaults:{rightAssetId:42}},
  {audio:{music:{assetId:42}}},
  {audio:{ambience:{assetId:'https://example.com/sound.mp3'}}},
  {audio:{sounds:[{assetId:'audio:custom:unknown:wav'}]}},
  {audio:{assetId:42}},
  {chapters:[{characterAssetIds:['unknown-character']}]},
  {cover:{design:{faces:{front:{elements:[{type:'image',assetId:'unknown-character'}]}}}}},
 ])expect(()=>assertCatalogOnlyMedia({project})).toThrow('등록된 자료');
});
it('preserves excluded catalogue references and conditional scene-only audio without granting rights',async()=>{
 const {EXCLUDED_AUDIO_ASSETS,AUDIO_CATALOG}=await import('../src/index');
 const conditional=AUDIO_CATALOG.find(asset=>asset.usagePolicy?.standaloneDownload==='prohibited');
 expect(conditional).toBeDefined();
 for(const id of [...EXCLUDED_AUDIO_ASSETS.map(asset=>asset.id),conditional!.id])expect(()=>assertCatalogOnlyMedia({project:{audio:{assetId:id},lines:[{audio:{ambience:{assetId:id}}}]}})).not.toThrow();
 expect(conditional!.usagePolicy?.standaloneDownload).toBe('prohibited');
});
it('retains historical exclusion recognition when tombstones are present',async()=>{
 const policy=await import('../src/audio-service-policy');
 const lookup=vi.spyOn(policy,'resolveExcludedAudioAsset').mockImplementation(id=>id==='historical-excluded'?{id,name:'Historical',source:'prior catalogue',reason:'withdrawn'}:undefined);
 try{expect(()=>assertCatalogOnlyMedia({project:{audio:{assetId:'historical-excluded',music:{assetId:'historical-excluded'}}}})).not.toThrow();}
 finally{lookup.mockRestore();}
});
