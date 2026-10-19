import { isCoverDesign,isStoryCover,type StoryProject,type StoryCover,type CoverDesign,COVER_FACE_IDS } from '@knolstory/story-domain';
import { makeTable,readTable,WorkbookIssue,type AuthoringTables,type TableSpec,type WorkbookScalar,type Column } from './model';
const c=(key:string,label:string,type:Column['type']='text',optional=false):Column=>({key,label,type,optional});
const cover:TableSpec={key:'cover',title:'표지 정보',columns:[c('present','표지 있음','boolean'),...Object.entries({author:'지은이',subtitle:'부제',authorNote:'작가의 말',layout:'배치',theme:'색감',font:'글꼴',titlePosition:'제목 위치',authorPosition:'지은이 위치',align:'정렬',titleSize:'제목 크기',titleColor:'제목 색',backgroundId:'배경 ID',characterId:'인물 ID',characterPosition:'인물 위치',presetId:'디자인 추천 설정'}).map(([key,label])=>c(key,label,key==='titleSize'?'number':'text',true))]};
const composition:TableSpec={key:'coverComposition',title:'표지 자유 배치',columns:[c('present','자유 배치 있음','boolean'),...Object.entries({version:'버전',backgroundFit:'배경 맞춤',backgroundX:'배경 가로',backgroundY:'배경 세로',backgroundZoom:'배경 확대',characterX:'인물 가로',characterBottom:'인물 하단',characterScale:'인물 크기',titleX:'제목 가로',titleY:'제목 세로',titleWidth:'제목 폭',showEdition:'판본 표시',textPanel:'글판'}).map(([key,label])=>c(key,label,key==='showEdition'?'boolean':['backgroundFit','textPanel'].includes(key)?'text':'number',true))]};
const design:TableSpec={key:'coverDesign',title:'표지 디자인',columns:[c('present','디자인 있음','boolean'),c('version','버전','number',true),c('trim','판형','text',true),c('stock','종이','text',true),c('color','바탕색','text',true),c('ink','글색','text',true),c('accent','강조색','text',true),c('texture','질감','text',true),c('enabled','띠지 있음','boolean',true),c('designId','띠지 디자인','text',true)]};
const faces:TableSpec={key:'coverFaces',title:'표지 면',columns:[c('face','면 ID'),c('preset','추천 설정')]};
const box=[c('x','가로 위치','number'),c('y','세로 위치','number'),c('w','너비','number'),c('h','높이','number')];
const layer=[c('face','면 ID'),c('id','레이어 ID'),c('position','레이어 순서','number'),c('role','역할')];
const texts:TableSpec={key:'coverTextLayers',title:'표지 글 레이어',columns:[...layer,c('region','영역'),c('contentKind','내용 방식'),c('bind','연결 필드','text',true),c('text','직접 입력 글','text',true),...box,c('fontId','글꼴'),c('fontSize','글 크기','number'),c('color','글색'),c('align','정렬'),c('writing','쓰기 방향')]};
const images:TableSpec={key:'coverImageLayers',title:'표지 그림 레이어',columns:[...layer,c('assetId','작품 자료 ID'),c('assetType','작품 자료 종류'),...box,c('frame','프레임'),c('fit','맞춤'),c('zoom','확대','number'),c('cropX','자르기 가로','number'),c('cropY','자르기 세로','number')]};
export const COVER_SPECS:TableSpec[]=[cover,composition,design,faces,texts,images];
const singleton=(tables:AuthoringTables,spec:TableSpec)=>{const rows=readTable(tables,spec);if(rows.length!==1)throw new WorkbookIssue(spec.title,3,'행','설정 행은 한 개여야 합니다.');return rows[0];};
function present(row:Record<string,WorkbookScalar>,spec:TableSpec){if(!row.present&&Object.entries(row).some(([key,value])=>key!=='present'&&value!==undefined))throw new WorkbookIssue(spec.title,3,'있음','없음 상태에 작성한 값이 있습니다.');return row.present===true;}
export function exportCoverDesignTables(value?:CoverDesign):AuthoringTables {
 if(value&&!isCoverDesign(value))throw new WorkbookIssue(design.title,0,'형식','지원하지 않는 표지 데이터입니다.');
 const textRows:Record<string,WorkbookScalar>[]=[],imageRows:Record<string,WorkbookScalar>[]=[];
 for(const face of COVER_FACE_IDS)for(const [position,e] of (value?.faces[face].elements??[]).entries()){
  const base={face,id:e.id,position,role:e.role,...e.box};
  if(e.type==='text')textRows.push({...base,region:e.region,contentKind:'bind' in e.content?'bind':'text',bind:'bind' in e.content?e.content.bind:undefined,text:'text' in e.content?e.content.text:undefined,...e.style});
  else imageRows.push({...base,assetId:e.assetId,assetType:e.assetType,frame:e.frame,fit:e.crop.fit,zoom:e.crop.zoom,cropX:e.crop.x,cropY:e.crop.y});
 }
 return {[design.key]:makeTable(design,[value?{present:true,version:value.version,trim:value.trim,...value.finish,...value.band}:{present:false}]),[faces.key]:makeTable(faces,value?COVER_FACE_IDS.map(face=>({face,preset:value.faces[face].preset})):[]),[texts.key]:makeTable(texts,textRows),[images.key]:makeTable(images,imageRows)};
}
export function readCoverDesignTables(tables:AuthoringTables):CoverDesign|undefined {
 const d=singleton(tables,design),fs=readTable(tables,faces),ts=readTable(tables,texts),ims=readTable(tables,images);
 if(!present(d,design)){if(fs.length||ts.length||ims.length)throw new WorkbookIssue(design.title,3,'디자인','디자인 없음 상태에 면 또는 레이어가 있습니다.');return undefined;}
 if(fs.length!==3||COVER_FACE_IDS.some(face=>fs.filter(f=>f.face===face).length!==1))throw new WorkbookIssue(faces.title,3,'면','앞표지·책등·뒤표지는 각각 한 행이어야 합니다.');
 const rows=[...ts,...ims],ids=rows.map(r=>r.id);if(new Set(ids).size!==ids.length)throw new WorkbookIssue(texts.title,0,'ID','레이어 ID가 중복되었습니다.');
 if(rows.some(r=>!COVER_FACE_IDS.includes(r.face as typeof COVER_FACE_IDS[number])))throw new WorkbookIssue(faces.title,0,'면','없는 면을 참조합니다.');
 const element=(r:Record<string,WorkbookScalar>,type:'text'|'image')=>{
  const sheet=type==='text'?texts:images,sourceRows=type==='text'?ts:ims;
  const rowNumber=sourceRows.indexOf(r)+3;
  const fail=(column:string,message:string):never=>{throw new WorkbookIssue(sheet.title,rowNumber,column,message);};
  const bounded=(key:string,min:number,max:number)=>{const v=r[key];if(typeof v!=='number'||v<min||v>max)fail(key,`${min}~${max} 범위의 숫자를 입력해 주세요.`);};
  bounded('x',0,1);bounded('y',0,1);bounded('w',.02,1);bounded('h',.02,1);
  if(Number(r.x)+Number(r.w)>1+1e-9||Number(r.y)+Number(r.h)>1+1e-9)fail('box','글·그림 상자가 표지 면을 넘습니다.');
  if(typeof r.id!=='string'||! /^[a-z\d][a-z\d_-]{0,63}$/i.test(r.id))fail('id','레이어 ID 형식이 올바르지 않습니다.');
  if(type==='text'){bounded('fontSize',.015,1);if(typeof r.color!=='string'||! /^#[\da-f]{6}$/i.test(r.color))fail('color','6자리 HEX 색을 입력해 주세요.');}
  else {bounded('zoom',r.fit==='cover'?1:.5,2);bounded('cropX',0,100);bounded('cropY',0,100);}
  const common={id:r.id,type,role:r.role,box:{x:r.x,y:r.y,w:r.w,h:r.h}};
  if(type==='image')return {...common,assetId:r.assetId,assetType:r.assetType,frame:r.frame,crop:{fit:r.fit,zoom:r.zoom,x:r.cropX,y:r.cropY}};
  if(!['bind','text'].includes(String(r.contentKind))||r.contentKind==='bind'&&(r.bind===undefined||r.text!==undefined)||r.contentKind==='text'&&(r.text===undefined||r.bind!==undefined))throw new WorkbookIssue(texts.title,0,'내용 방식','연결 필드 또는 직접 글 중 하나만 작성해야 합니다.');
  return {...common,region:r.region,content:r.contentKind==='bind'?{bind:r.bind}:{text:r.text},style:{fontId:r.fontId,fontSize:r.fontSize,color:r.color,align:r.align,writing:r.writing}};
 };
 const faceValues=Object.fromEntries(COVER_FACE_IDS.map(face=>{
  const faceRows=rows.filter(r=>r.face===face),positions=faceRows.map(r=>r.position);
  if(positions.some(p=>typeof p!=='number'||!Number.isInteger(p)||p<0)||new Set(positions).size!==positions.length)throw new WorkbookIssue(faces.title,0,'순서','레이어 순서는 중복 없는 0 이상의 정수여야 합니다.');
  return [face,{preset:fs.find(f=>f.face===face)!.preset,elements:[...faceRows].sort((a,b)=>Number(a.position)-Number(b.position)).map(r=>element(r,ts.includes(r)?'text':'image'))}];
 }));
 const result={version:d.version,trim:d.trim,finish:{stock:d.stock,color:d.color,ink:d.ink,accent:d.accent,texture:d.texture},band:{enabled:d.enabled,designId:d.designId},faces:faceValues};
 if(!isCoverDesign(result))throw new WorkbookIssue(design.title,3,'형식','표지 색·추천 설정·글·그림·크기·배치 범위를 확인해 주세요.');
 return result;
}
export function exportCoverTables(project:StoryProject):AuthoringTables {
 const value=project.cover;
 const scalarValues=value?Object.fromEntries(Object.entries(value).filter(([key])=>!['composition','design'].includes(key))) as Record<string,WorkbookScalar>:{};
 return {[cover.key]:makeTable(cover,[value?{...scalarValues,present:true}:{present:false}]),[composition.key]:makeTable(composition,[value?.composition?{...value.composition,present:true}:{present:false}]),...exportCoverDesignTables(value?.design)};
}
export function readCoverTables(tables:AuthoringTables,project:StoryProject):StoryProject {
 const row=singleton(tables,cover),comp=singleton(tables,composition),designValue=readCoverDesignTables(tables),hasComposition=present(comp,composition);
 const {cover:_old,...base}=project;
 if(!present(row,cover)){if(hasComposition||designValue)throw new WorkbookIssue(cover.title,3,'표지','표지 없음 상태에 배치 또는 디자인이 있습니다.');return base;}
 const {present:_present,...values}=row,{present:_comp,...compValues}=comp;
 const result={...Object.fromEntries(Object.entries(values).filter(([,v])=>v!==undefined)),...(hasComposition?{composition:compValues}:{}),...(designValue?{design:designValue}:{})};
 if(!isStoryCover(result))throw new WorkbookIssue(cover.title,3,'형식','표지 설정·작품 자료 ID·색·크기·배치 범위를 확인해 주세요.');
 return {...base,cover:result as StoryCover};
}
