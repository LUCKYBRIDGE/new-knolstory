import { cloneCoverDesign, type CoverDesign, type CoverElement, type CoverFaceId, type CoverFacePresetId, type CoverTextElement } from "@knolstory/story-domain";
import { COVER_THEMES, type StoryCover } from "@knolstory/story-domain";
import { ASSET_CATALOG } from "@knolstory/asset-registry";

export const COVER_DESIGN_OPTIONS: { id: CoverFacePresetId; label: string }[] = [
  { id: "picturebook", label: "그림책" }, { id: "arch", label: "아치 창" }, { id: "cloth", label: "천 장정" }, { id: "literary", label: "문학 단행본" },
  { id: "banded", label: "띠지와 장면" }, { id: "character", label: "인물 중심" }, { id: "cameo", label: "타원 창" }, { id: "poster", label: "포스터 판" },
];
function faceElements(face: CoverFaceId, preset: CoverFacePresetId, cover: StoryCover, finish: CoverDesign["finish"]): CoverElement[] {
  const ink = finish.ink, font = cover.font;
  const text = (role: CoverTextElement["role"], content: CoverTextElement["content"], x: number, y: number, w: number, h: number, size: number, region: "face" | "band" = "face"): CoverTextElement => ({
    id: `${face}-${role}`, type: "text", role, region, content, box: { x, y, w, h },
    style: { fontId: font, fontSize: size, color: region === "band" ? finish.color : ink, align: "center", writing: face === "spine" ? "vertical" : "horizontal" },
  });
  const title = text("title", { bind: "project.title" }, .10, .10, .8, .24, .13);
  const result: CoverElement[] = [title];
  const number = /seonnyeo/.test(cover.backgroundId) ? "03" : /onggojib/.test(cover.backgroundId) ? "02" : /heungbu/.test(cover.backgroundId) ? "04" : "01";
  if (face === "spine") {
    const spine = [
    text("title", { bind: "project.title" }, .16, .09, .68, .56, .55),
    text("author", { bind: "cover.author" }, .2, .68, .6, .12, .4),
    text("number", { text: number }, .2, .15, .6, .7, .45, "band"),
    ];
    const positions = { picturebook: .08, arch: .12, cloth: .09, literary: .16, banded: .07, character: .20, cameo: .13, poster: .06 };
    spine[0].box.y = positions[preset]; spine[0].box.h = .65 - positions[preset];
    spine[0].style.fontId = preset === "picturebook" ? "rounded" : preset === "poster" || preset === "character" ? "sans" : "serif";
    return spine;
  }
  if (face === "back") {
    title.box = { x: .12, y: .08, w: .76, h: .15 }; title.style.fontSize = .075;
    const margins = { picturebook: .10, arch: .18, cloth: .17, literary: .13, banded: .08, character: .11, cameo: .21, poster: .07 };
    const margin = margins[preset];
    const description = text("description", { bind: "project.description" }, margin, preset === "literary" ? .28 : .31, 1 - 2 * margin, .23, .043);
    description.style.align = preset === "literary" || preset === "poster" || preset === "banded" ? "left" : "center";
    title.style.fontId = preset === "picturebook" ? "rounded" : preset === "poster" ? "sans" : "serif";
    result.push(description, text("authorNote", { bind: "cover.authorNote" }, margin, .57, 1 - 2 * margin, .2, .038), text("imprint", { text: "놀스토리" }, .1, .92, .8, .04, .035));
    result.push(text("custom", { text: "이야기를 읽어 주셔서 고마워요." }, .12, .18, .76, .65, .035, "band"));
    return result;
  }
  if (preset === "picturebook") { title.box.y = .08; title.style.fontId = "rounded"; }
  if (preset === "literary") { title.box = { x: .12, y: .15, w: .76, h: .25 }; title.style.fontId = "serif"; }
  if (preset === "poster") { title.box.y = .05; title.box.h = .22; }
  result.push(text("subtitle", { bind: "cover.subtitle" }, .10, preset === "literary" ? .43 : .36, .8, .065, .04));
  const box = { x: .10, y: .45, w: .8, h: .35 };
  if (preset === "cloth") Object.assign(box, { x: .25, y: .49, w: .5, h: .3 });
  if (preset === "literary") Object.assign(box, { x: .14, y: .58, w: .72, h: .2 });
  if (preset === "poster") Object.assign(box, { x: .06, y: .36, w: .88, h: .45 });
  if (cover.backgroundId && preset !== "character") result.push({ id: `${face}-scene`, type: "image", role: "scene", assetId: cover.backgroundId, assetType: "background", box,
    // Old posters keep their complete artwork. New wide scenes can fill a window.
    frame: /poster|scene/.test(cover.backgroundId) ? "rect" : preset === "arch" ? "arch" : preset === "cameo" ? "oval" : "rect", crop: { fit: /poster|scene/.test(cover.backgroundId) ? "contain" : "cover", zoom: 1, x: 50, y: 50 } });
  if (cover.characterId && (preset === "character" || !/poster|scene/.test(cover.backgroundId))) result.push({ id: `${face}-actor`, type: "image", role: "actor", assetId: cover.characterId, assetType: "character", box: { x: .26, y: .45, w: .48, h: .34 }, frame: "rect", crop: { fit: "contain", zoom: 1, x: 50, y: 100 } });
  result.push(text("author", { bind: "cover.author" }, .12, .91, .76, .06, .035), text("edition", { text: "놀스토리 · 우리 이야기" }, .12, .02, .76, .04, .029));
  result.push(text("description", { bind: "project.description" }, .12, .16, .76, .7, .038, "band"));
  return result;
}
export function createCoverDesign(cover: StoryCover): CoverDesign {
  const assets = new Map(ASSET_CATALOG.map(asset => [asset.id, asset.type]));
  cover = { ...cover, backgroundId: assets.get(cover.backgroundId) === "background" ? cover.backgroundId : "", characterId: assets.get(cover.characterId) === "character" ? cover.characterId : "" };
  const theme = COVER_THEMES[cover.theme];
  const finish: CoverDesign["finish"] = { stock: "cream", color: theme.paper, ink: theme.ink, accent: theme.accent, texture: "subtle" };
  const preset: CoverFacePresetId = cover.presetId === "arch" ? "arch" : cover.presetId === "oval" ? "cameo" : cover.layout === "bold" ? "character" : cover.layout === "picture" ? "picturebook" : "cloth";
  return cloneCoverDesign({ version: 1, trim: "trade-300-435", finish, band: { enabled: false, designId: "classic" }, faces: {
    front: { preset, elements: faceElements("front", preset, cover, finish) }, spine: { preset: "cloth", elements: faceElements("spine", "cloth", cover, finish) }, back: { preset: "literary", elements: faceElements("back", "literary", cover, finish) },
  } });
}

export type { CoverDesign, CoverElement, CoverFaceId, CoverFacePresetId, CoverTextElement };
export type CoverImageElement = Extract<CoverElement, {type:'image'}>;
export type CoverBox = CoverElement['box'];
type ElementPatch = { box?: CoverBox; content?: CoverTextElement['content']; style?: Partial<CoverTextElement['style']>; region?: CoverTextElement['region']; assetId?: string; assetType?: CoverImageElement['assetType']; frame?: CoverImageElement['frame']; crop?: Partial<CoverImageElement['crop']> };
function validated(design: CoverDesign): CoverDesign { cloneCoverDesign(design); return design; }
function replaceFace(design:CoverDesign,face:CoverFaceId,elements:CoverElement[]):CoverDesign {
  return validated({...design,faces:{...design.faces,[face]:{...design.faces[face],elements}}});
}
export function patchCoverElement(design:CoverDesign,face:CoverFaceId,id:string,patch:ElementPatch):CoverDesign {
  if(!design.faces[face].elements.some(item=>item.id===id)) throw new Error('수정할 상자를 찾을 수 없어요.');
  return replaceFace(design,face,design.faces[face].elements.map(item=> {
    if(item.id!==id)return item;
    if(item.type==='text')return {...item,...(patch.box?{box:patch.box}:{}),...(patch.content?{content:patch.content}:{}),...(patch.region?{region:patch.region}:{}),...(patch.style?{style:{...item.style,...patch.style}}:{})};
    return {...item,...(patch.box?{box:patch.box}:{}),...(patch.assetId?{assetId:patch.assetId}:{}),...(patch.assetType?{assetType:patch.assetType}:{}),...(patch.frame?{frame:patch.frame}:{}),...(patch.crop?{crop:{...item.crop,...patch.crop}}:{})};
  }));
}
export function addCoverElement(design:CoverDesign,face:CoverFaceId,item:CoverElement):CoverDesign {
  return replaceFace(design,face,[...design.faces[face].elements,structuredClone(item)]);
}
export function removeCoverElement(design:CoverDesign,face:CoverFaceId,id:string):CoverDesign {
  return replaceFace(design,face,design.faces[face].elements.filter(item=>item.id!==id));
}
export function reorderCoverElement(design:CoverDesign,face:CoverFaceId,id:string,direction:-1|1):CoverDesign {
  const items=design.faces[face].elements,at=items.findIndex(item=>item.id===id),target=at+direction;
  if(at<0||target<0||target>=items.length)return design;
  return replaceFace(design,face,items.map((item,index)=>index===at?items[target]:index===target?items[at]:item));
}
export function editCoverBox(box:CoverBox,key:keyof CoverBox,percent:number):CoverBox {
  if(!Number.isFinite(percent))return box;
  const candidate={...box,[key]:percent/100};
  const w=Math.max(.02,Math.min(1,candidate.w)),h=Math.max(.02,Math.min(1,candidate.h));
  return {w,h,x:Math.max(0,Math.min(1-w,candidate.x)),y:Math.max(0,Math.min(1-h,candidate.y))};
}
/** Presets re-layout existing boxes and preserve copy, unknown cover fields and deleted content. */
export function selectCoverFacePreset(design:CoverDesign,face:CoverFaceId,preset:CoverFacePresetId,cover:StoryCover):CoverDesign {
  const templates=faceElements(face,preset,cover,design.finish);
  const elements=design.faces[face].elements.map(item=> {
    const template=templates.find(candidate=>candidate.type===item.type&&candidate.role===item.role&&(candidate.type!=='text'||item.type!=='text'||candidate.region===item.region));
    if(!template)return item;
    if(item.type==='text'&&template.type==='text')return {...item,box:template.box,style:{...item.style,fontId:template.style.fontId,fontSize:template.style.fontSize,align:template.style.align,writing:template.style.writing}};
    if(item.type==='image'&&template.type==='image')return {...item,box:template.box,frame:item.assetType==='character'||/poster|scene/.test(item.assetId)?'rect' as const:template.frame,crop:{fit:'contain' as const,zoom:1,x:50,y:50}};
    return item;
  });
  return validated({...design,faces:{...design.faces,[face]:{preset,elements}}});
}
export function coverElementText(item:CoverTextElement,project:{title:string;description:string},cover:StoryCover):string {
  if('text' in item.content)return item.content.text;
  const values={'project.title':project.title,'project.description':project.description,'cover.author':cover.author,'cover.subtitle':cover.subtitle,'cover.authorNote':cover.authorNote};
  return values[item.content.bind];
}
