import { tablePayload, readTablePayload } from './story-table';
import { isCoverDesign, coverDesignAssetReferences, type CoverDesign } from '../../story-domain/src/legacy/cover-design';
import { STORY_ASSETS } from '../../story-domain/src/legacy/story-assets';
/** Static picture book format from fixed legacy baseline 18da4fc, refined strict keys. */
export type ShortStoryPage = { id:string;order:number;title:string;text:string;backgroundId:string;leftAssetId:string;rightAssetId:string };
export type ShortStoryProject = { id:string;title:string;description:string;authorDisplayName:string;source?:{kind:'original'|'preset';presetId?:string};cover:{backgroundId:string;characterId:string;authorNote:string;design?:CoverDesign};pages:ShortStoryPage[];updatedAt:string };
const MAX_BYTES=10*1024*1024;
const record=(value:unknown):value is Record<string,unknown> => !!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):value is string => typeof value==='string';
const keys=(value:Record<string,unknown>, allowed:string[]) => Object.keys(value).every(key=>allowed.includes(key));
const asset=(value:unknown,type:'character'|'background') => value===''||text(value)&&STORY_ASSETS.some(a=>a.id===value&&a.type===type);
export function newShortStoryPage():ShortStoryPage { return {id:crypto.randomUUID(),order:1,title:'',text:'',backgroundId:'',leftAssetId:'',rightAssetId:''}; }
export function newShortStory():ShortStoryProject { return {id:crypto.randomUUID(),title:'나의 짧은 이야기',description:'',authorDisplayName:'',source:{kind:'original'},cover:{backgroundId:'',characterId:'',authorNote:''},pages:[newShortStoryPage()],updatedAt:new Date().toISOString()}; }
export function parseShortStory(value:unknown):ShortStoryProject {
  if(!record(value)||!keys(value,['id','title','description','authorDisplayName','source','cover','pages','updatedAt'])||!text(value.id)||!value.id||!['title','description','authorDisplayName','updatedAt'].every(key=>text(value[key]))||!Number.isFinite(Date.parse(String(value.updatedAt))))throw new Error('숏스토리 제목·저장 정보와 지원하는 필드를 확인해 주세요. 음악·연출은 숏스토리에 포함하지 않습니다.');
  const cover=value.cover;
  if(!record(cover)||!keys(cover,['backgroundId','characterId','authorNote','design'])||!asset(cover.backgroundId,'background')||!asset(cover.characterId,'character')||!text(cover.authorNote))throw new Error('표지의 그림 정보를 확인해 주세요.');
  if(cover.design!==undefined&&(!isCoverDesign(cover.design)||coverDesignAssetReferences(cover.design).some(ref=>!asset(ref.id,ref.type))))throw new Error('표지 글·그림 상자의 형식을 확인해 주세요.');
  if(value.source!==undefined&&(!record(value.source)||!keys(value.source,['kind','presetId'])||!['original','preset'].includes(String(value.source.kind))||value.source.presetId!==undefined&&!text(value.source.presetId)))throw new Error('숏스토리 출처를 확인해 주세요.');
  if(!Array.isArray(value.pages)||!value.pages.length||value.pages.length>500)throw new Error('숏스토리는 1–500쪽으로 만들 수 있어요.');
  const ids=new Set<string>();
  for(const [i,page] of value.pages.entries()) {
    if(!record(page)||!keys(page,['id','order','title','text','backgroundId','leftAssetId','rightAssetId'])||!text(page.id)||!page.id||ids.has(page.id)||page.order!==i+1||!text(page.title)||!text(page.text)||!asset(page.backgroundId,'background')||!asset(page.leftAssetId,'character')||!asset(page.rightAssetId,'character'))throw new Error(`${i+1}쪽의 순서·글·그림 정보를 확인해 주세요. 음악·연출은 지원하지 않습니다.`);
    ids.add(page.id);
  }
  return structuredClone(value) as ShortStoryProject;
}
export function encodeShortStory(project:ShortStoryProject):string {
  const result=JSON.stringify({manifest:{format:'shortstory',version:1,kind:'project'},project:parseShortStory(project)},null,2);
  if(new TextEncoder().encode(result).length>MAX_BYTES)throw new Error('숏스토리 파일은 10MB 이하로 저장할 수 있어요.');
  return result;
}
export function decodeShortStory(text:string):ShortStoryProject {
  if(new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('숏스토리 파일은 10MB 이하로 열 수 있어요.');
  let data;try{data=JSON.parse(text);}catch{throw new Error('숏스토리 파일을 읽지 못했어요.');}
  if(!record(data)||!keys(data,['manifest','project'])||!record(data.manifest)||!keys(data.manifest,['format','version','kind'])||data.manifest.format!=='shortstory'||data.manifest.version!==1||data.manifest.kind!=='project')throw new Error('지원하지 않는 숏스토리 파일 버전이나 추가 자료가 있어요. 원본 파일은 보존해 주세요.');
  return parseShortStory(data.project);
}
export function exportShortStoryTable(project:ShortStoryProject):string[][] {
  const checked=parseShortStory(project);
  return [...tablePayload('shortstory',checked),['project',checked.id,'','',checked.title,checked.authorDisplayName,checked.description],...checked.pages.map(page=>['page',page.id,'',String(page.order),page.title,'',page.text,page.backgroundId,page.leftAssetId,page.rightAssetId])];
}
export function importShortStoryTable(rows:readonly(readonly string[])[]):ShortStoryProject {
  const original=parseShortStory(readTablePayload(rows,'shortstory'));
  if(rows.slice(2).some(row=>row.length&&(!['payload','project','page'].includes(row[0])||row[0]==='project'&&(row.slice(7).some(Boolean)||row[2]||row[3])||row[0]==='page'&&(row.slice(10).some(Boolean)||row[2]||row[5]))))throw new Error('지원하지 않는 숏스토리 표 행·셀입니다. 원본을 버리지 않고 가져오기를 중단했어요.');
  const projectRows=rows.filter(row=>row[0]==='project');
  if(projectRows.length!==1||projectRows[0][1]!==original.id)throw new Error('숏스토리 작품 행을 확인해 주세요.');
  const pages=rows.filter(row=>row[0]==='page').map(row=>({id:row[1],order:Number(row[3]),title:row[4]??'',text:row[6]??'',backgroundId:row[7]??'',leftAssetId:row[8]??'',rightAssetId:row[9]??''})).sort((a,b)=>a.order-b.order);
  return parseShortStory({...original,title:projectRows[0][4]??'',authorDisplayName:projectRows[0][5]??'',description:projectRows[0][6]??'',pages});
}
