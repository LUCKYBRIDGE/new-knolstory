import {ASSET_CATALOG} from '@knolstory/asset-registry';
import {describe,it,expect} from 'vitest';
import {assertCatalogOnlyMedia} from './catalog-only-authoring';
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
