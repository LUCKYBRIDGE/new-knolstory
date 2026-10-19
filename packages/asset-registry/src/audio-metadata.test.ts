import {expect,it} from 'vitest';
import {validateAudioMetadata} from './audio-metadata';
it('preserves author audio facets and rejects malformed or unbounded attributes',()=>{
 const value={category:'ambience',tags:['학교 종','남성'],originalName:'Original',source:'Pixabay'};
 expect(validateAudioMetadata(value)).toEqual(value);
 expect(validateAudioMetadata(undefined)).toBeUndefined();
 for(const bad of [{...value,category:'other'},{...value,tags:['']},{...value,tags:['학교 종','학교 종']},{...value,tags:Array(25).fill('x')},{...value,tags:[Array(61).fill('x').join('')]},{...value,extra:true}])expect(()=>validateAudioMetadata(bad)).toThrow();
});
import {audioAssetCategory,searchAudioAssets,type AudioAsset} from './audio';
it('searches author names, original names and provider and combines tag/category/source facets',()=>{
 const asset:AudioAsset={id:`audio:custom:${'a'.repeat(64)}:wav`,name:'부엌소리1',kind:'music',src:'',runtimePath:'',mime:'audio/wav',metadata:{category:'ambience',tags:['부엌','여성'],originalName:'Kitchen',source:'Pixabay'}};
 expect(audioAssetCategory(asset)).toBe('ambience');expect(searchAudioAssets([asset],'music','Kitchen Pixabay','ambience',{tags:['여성'],source:'Pixabay'})).toEqual([asset]);
 expect(searchAudioAssets([asset],'music','','background')).toEqual([]);expect(searchAudioAssets([asset],'music','','ambience',{tags:['남성']})).toEqual([]);
});
