/** Searchable author attributes; these do not alter playback commands or asset IDs. */
export type AudioMetadata = Readonly<{
 category:'background'|'ambience'|'effect';tags:readonly string[];originalName?:string;source?:string;
}>;
export function validateAudioMetadata(value:unknown):AudioMetadata|undefined {
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('소리 속성 형식을 확인해 주세요.');
 const item=value as Record<string,unknown>;
 if(Object.keys(item).some(key=>!['category','tags','originalName','source'].includes(key))||!['background','ambience','effect'].includes(String(item.category))||typeof item.category!=='string')throw Error('소리 종류와 지원하는 속성을 확인해 주세요.');
 if(!Array.isArray(item.tags)||item.tags.length>24||Array.from(item.tags).some(tag=>typeof tag!=='string'||!tag.trim()||tag.length>60)||new Set(item.tags).size!==item.tags.length)throw Error('소리 태그는 중복 없이 24개, 각각 60자까지 입력해 주세요.');
 for(const key of ['originalName','source'])if(item[key]!==undefined&&(typeof item[key]!=='string'||!String(item[key]).trim()||String(item[key]).length>200))throw Error('원래 이름과 출처는 200자까지 입력해 주세요.');
 return {category:item.category as AudioMetadata['category'],tags:[...item.tags],...(item.originalName===undefined?{}:{originalName:item.originalName as string}),...(item.source===undefined?{}:{source:item.source as string})};
}
