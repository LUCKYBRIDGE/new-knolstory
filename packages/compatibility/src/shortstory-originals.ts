import packs from './shortstory-originals-data.json';
import { parseShortStory, type ShortStoryProject } from './shortstory';
/** PRESERVE: complete four classic illustration packs from story-maker@18da4fc.
 * The pack's editorial referenceText is the reading text, not newly authored summaries.
 * Pack metadata (questions, scene identity, illustration revision and credit) remains in data.json.
 * The v1 page projection deliberately does not claim to import v2 student activity documents. */
export type ShortStoryWorkKey = 'rabbit'|'onggojib'|'seonnyeo'|'heungbu';
export const shortStoryOriginals = packs.map(pack=>({key:pack.worldId as ShortStoryWorkKey,id:`shortstory-original-${pack.worldId}`,title:pack.title,credit:pack.editorial.credit,pageCount:pack.scenes.length}));
export function isShortStoryWorkKey(value:string|null):value is ShortStoryWorkKey {return shortStoryOriginals.some(book=>book.key===value);}
export function getShortStoryOriginal(key:ShortStoryWorkKey):ShortStoryProject {
 const pack=packs.find(pack=>pack.worldId===key);if(!pack)throw Error('그림책 원본을 찾을 수 없어요.');
 return parseShortStory({id:`shortstory-original-${key}`,title:pack.title,description:pack.description,authorDisplayName:'전래 이야기 · 놀퀴즈',source:{kind:'preset',presetId:pack.packId},cover:{backgroundId:pack.cover.backgroundId,characterId:pack.cover.characterId,authorNote:pack.cover.authorNote},pages:pack.scenes.map((scene,i)=>({id:scene.sourceSceneId,order:i+1,title:scene.title,text:scene.referenceText,backgroundId:scene.art.assetId,leftAssetId:'',rightAssetId:''})),updatedAt:'2026-10-06T00:00:00.000Z'});
}
