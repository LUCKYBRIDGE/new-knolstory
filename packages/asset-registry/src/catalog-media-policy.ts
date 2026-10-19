import {resolveAsset,type Asset} from './image-catalog';
import {resolveAudioAsset} from './audio';
import {resolveExcludedAudioAsset} from './audio-service-policy';
type RecordValue=Record<string,unknown>;
const record=(value:unknown):RecordValue=>value&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const denied=()=>new Error('외부 그림·음원은 사용할 수 없어요. 놀스토리에 등록된 자료를 선택해 주세요.');
/** Inspect media-owned fields only after schema validation; never traverse authored prose/memos. */
export function assertCatalogOnlyMedia(value:unknown):void{
 const root=record(value),document=record(root.document),project=record(document.project??root.project??value);
 if(list(root.audioResources).length)throw Error('외부 음원이 첨부된 작품은 가져올 수 없어요. 놀스토리에 등록된 소리로 바꾼 작품 파일을 사용해 주세요.');
 function image(id:unknown,type:Asset['type']){
  if(id===undefined||id===''||id==='__none')return;
  if(typeof id!=='string'||resolveAsset(id)?.type!==type)throw denied();
 }
 function audio(value:unknown){
  const source=record(value),cues=[source.music,source.ambience,...list(source.sounds)];
  for(const cue of cues){const id=record(cue).assetId;if(id!==undefined&&(typeof id!=='string'||!resolveAudioAsset(id)&&!resolveExcludedAudioAsset(id)))throw denied();}
  // Raw project-level audio is not canonical but direct loader inputs still fail closed.
  if(source.assetId!==undefined&&(typeof source.assetId!=='string'||!resolveAudioAsset(source.assetId)&&!resolveExcludedAudioAsset(source.assetId)))throw denied();
 }
 function stage(value:unknown){const source=record(value);image(source.backgroundId,'background');image(source.leftAssetId,'character');image(source.rightAssetId,'character');}
 stage(project.stageDefaults);audio(project.audio);
 for(const character of list(project.characters))image(record(character).defaultImageId,'character');
 for(const value of [...list(project.chapters),...list(project.lines)]){
  const source=record(value);stage(source);audio(source.audio);
  for(const id of list(source.backgroundAssetIds))image(id,'background');
  for(const id of list(source.characterAssetIds))image(id,'character');
  const composition=record(source.stageComposition);
  for(const actor of [...list(composition.leftActors),...list(composition.rightActors)])image(record(actor).assetId,'character');
 }
 const cover=record(project.cover);image(cover.backgroundId,'background');image(cover.characterId,'character');
 const faces=record(record(cover.design).faces);
 for(const face of Object.values(faces))for(const item of list(record(face).elements)){const element=record(item);if(element.type==='image')image(element.assetId,element.assetType==='background'?'background':'character');}
}
