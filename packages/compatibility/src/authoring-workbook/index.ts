import {VISIBILITY_SPECS,exportVisibilityTables,readVisibilityTables,upgradeVisibilityTables} from './visibility';
import {TEXT_VARIANT_SPECS,exportTextVariantTables,readTextVariantTables,upgradeTextVariantTables} from './text-variants';
import {shiftDecimal} from './time-units';
import {BRANCH_COLUMNS,BRANCH_SPECS,exportBranchTables,upgradeBranchGroupTables,validateBranchGroupOwners} from './branch';
import {createStoryDocument,CURRENT_SCHEMA_VERSION,type StoryProject} from '@knolstory/story-domain';
import {createAuthoringArchive,validateAuthoringArchive,type AuthoringArchive,type AuthoringArchiveInput,type AuthoringAudioResource} from '../authoring-archive';
import {parseShortStory,type ShortStoryProject} from '../shortstory';
import {PROJECT_SPECS,exportProjectTables,readProjectTables} from './project';
import {SCORE_SPECS,exportScoreTables,readScoreTables} from './scores';
import {FLOW_SPECS,exportFlowTables,readFlowTables} from './flow';
import {STAGE_SPECS,exportStageTables,readStageTables} from './stage';
import {AUDIO_SPECS,exportAudioTables,readAudioTables} from './audio';
import {PRESENTATION_SPECS,exportPresentationTables,readPresentationTables} from './presentation';
import {COVER_SPECS,exportCoverTables,readCoverTables,exportCoverDesignTables,readCoverDesignTables} from './cover';
import {PREPARATION_SPECS,exportPreparationTables,readPreparationTables} from './preparation';
import {makeTable,readTable,WorkbookIssue,requireUnique,type Column,type TableSpec,type AuthoringWorkbook,type AuthoringTables,type WorkbookScalar} from './model';
export * from './model';
const c=(key:string,label:string,type:Column['type']='text',optional=false):Column=>({key,label,type,optional});
const meta:TableSpec={key:'metadata',title:'형식 정보',columns:[c('format','형식'),c('version','표 버전','number'),c('kind','작품 종류'),c('schemaVersion','문서 버전','number'),c('savedAt','파일 저장 시각'),c('appVersion','앱 버전'),c('assetCatalogVersion','작품 자료 목록 버전','text',true)]};
const provenanceKeys=['provider','source','author','license','commercialUse','redistribution','attribution','sourceSha256','generatedAt','generationPlan','providerAssetId','termsUrl','termsCheckedAt','replacementAssetId'] as const;
const provenanceLabels:Record<typeof provenanceKeys[number],string>={provider:'자료 제공자',source:'원본 출처',author:'만든 사람',license:'이용 허가',commercialUse:'상업 이용 허용',redistribution:'재배포 허용',attribution:'출처 표시 문구',sourceSha256:'원본 무결성 해시',generatedAt:'생성 시각',generationPlan:'생성 과정 메모',providerAssetId:'제공자 자료 ID',termsUrl:'이용 조건 주소',termsCheckedAt:'이용 조건 확인일',replacementAssetId:'대체 작품 자료 ID'};
const resources:TableSpec={key:'resources',title:'사용자 음원 정보',columns:[c('id','음원 ID'),c('name','파일 이름'),c('mime','파일 형식'),c('kind','음원 종류'),c('position','자료 순서','number'),c('provenancePresent','출처 있음','boolean'),c('metadataPresent','검색 속성 있음','boolean'),c('category','사용 용도','text',true),c('originalName','원래 이름','text',true),c('metadataSource','검색 출처','text',true),...provenanceKeys.map(key=>c(key,`출처 · ${provenanceLabels[key]}`,'text',true))]};
const tags:TableSpec={key:'resourceTags',title:'소리 검색 태그',columns:[c('id','음원 ID'),c('position','태그 순서','number'),c('tag','검색 태그')]};
const bytes:TableSpec={key:'resourceBytes',title:'첨부 음원 원본',columns:[c('id','음원 ID'),c('part','조각 순서','number'),c('data','음원 원본 데이터 (수정 금지)')]};
const shortProject:TableSpec={key:'shortProject',title:'그림책 정보',columns:[...['id','title','description','authorDisplayName','updatedAt','backgroundId','characterId','authorNote'].map(key=>c(key,({id:'작품 ID',title:'제목',description:'소개',authorDisplayName:'지은이',updatedAt:'수정 시각',backgroundId:'표지 배경 ID',characterId:'표지 인물 ID',authorNote:'마지막 인사'} as Record<string,string>)[key])),c('sourcePresent','출처 있음','boolean'),c('sourceKind','출처 종류','text',true),c('presetId','기본 그림책 ID','text',true)]};
const pages:TableSpec={key:'pages',title:'그림책 쪽',columns:[c('id','쪽 ID'),c('order','쪽 순서','number'),c('title','제목'),c('text','이야기'),c('backgroundId','배경 ID'),c('leftAssetId','왼쪽 인물 ID'),c('rightAssetId','오른쪽 인물 ID')]};
export function authoringWorkbookSpecs(kind:'knolstory'|'shortstory'):readonly TableSpec[]{return kind==='knolstory'?[meta,...PROJECT_SPECS,...TEXT_VARIANT_SPECS,...VISIBILITY_SPECS,...BRANCH_SPECS,...FLOW_SPECS,...SCORE_SPECS,...STAGE_SPECS,...AUDIO_SPECS,...PRESENTATION_SPECS,...COVER_SPECS,...PREPARATION_SPECS,resources,tags,bytes]:[meta,shortProject,pages,...COVER_SPECS.slice(2)];}
function exportResources(values:readonly AuthoringAudioResource[]):AuthoringTables {
 return {[resources.key]:makeTable(resources,values.map((value,position)=>({id:value.id,name:value.name,mime:value.mime,kind:value.kind,position,provenancePresent:value.provenance!==undefined,metadataPresent:value.metadata!==undefined,category:value.metadata?.category,originalName:value.metadata?.originalName,metadataSource:value.metadata?.source,...Object.fromEntries(provenanceKeys.map(key=>[key,value.provenance?.[key]]))}))),[tags.key]:makeTable(tags,values.flatMap(value=>(value.metadata?.tags??[]).map((tag,position)=>({id:value.id,position,tag})))),[bytes.key]:makeTable(bytes,values.flatMap(value=>{const parts:Record<string,WorkbookScalar>[]=[];for(let start=0;start<value.data.length;start+=20000)parts.push({id:value.id,part:parts.length,data:value.data.slice(start,start+20000)});return parts;}))};
}
function readResources(tables:AuthoringTables):AuthoringAudioResource[]{
 const records=readTable(tables,resources),parts=readTable(tables,bytes),tagRows=readTable(tables,tags);requireUnique(records,'id',resources.title);
 if(tagRows.some(tag=>!records.some(r=>r.id===tag.id)))throw new WorkbookIssue(tags.title,0,'음원 ID','정보가 없는 태그입니다.');
 if(parts.some(part=>!records.some(r=>r.id===part.id)))throw new WorkbookIssue(bytes.title,0,'음원 ID','정보가 없는 첨부 자료입니다.');
 const positions=records.map(record=>record.position);if(positions.some(value=>!Number.isSafeInteger(value)||Number(value)<0)||new Set(positions).size!==positions.length)throw new WorkbookIssue(resources.title,0,'순서','자료 순서를 확인해 주세요.');
 return [...records].sort((a,b)=>Number(a.position)-Number(b.position)).map(record=>{
  const chunks=parts.filter(part=>part.id===record.id).sort((a,b)=>Number(a.part)-Number(b.part));
  if(!chunks.length||chunks.some((part,index)=>part.part!==index))throw new WorkbookIssue(bytes.title,0,'조각','첨부 조각이 누락되거나 중복되었습니다.');
  const attributes=tagRows.filter(tag=>tag.id===record.id).sort((a,b)=>Number(a.position)-Number(b.position));
  if(attributes.some((tag,index)=>tag.position!==index))throw new WorkbookIssue(tags.title,0,'태그 순서','태그 순서를 확인해 주세요.');
  if(!record.metadataPresent&&(attributes.length||['category','originalName','metadataSource'].some(key=>record[key]!==undefined)))throw new WorkbookIssue(resources.title,0,'검색 속성','속성 없음과 작성 내용이 충돌합니다.');
  const metadata={category:record.category,tags:attributes.map(tag=>tag.tag),...(record.originalName===undefined?{}:{originalName:record.originalName}),...(record.metadataSource===undefined?{}:{source:record.metadataSource})};
  const provenance=Object.fromEntries(provenanceKeys.filter(key=>record[key]!==undefined).map(key=>[key,record[key]]));
  if(!record.provenancePresent&&Object.keys(provenance).length)throw new WorkbookIssue(resources.title,0,'출처','출처 없음과 작성 내용이 충돌합니다.');
  return {id:record.id,name:record.name,mime:record.mime,kind:record.kind,data:chunks.map(part=>part.data).join(''),...(record.provenancePresent?{provenance}:{}),...(record.metadataPresent?{metadata}:{})} as AuthoringAudioResource;
 });
}
export async function exportAuthoringWorkbook(input:AuthoringArchiveInput|AuthoringArchive):Promise<AuthoringWorkbook>{
 const archive=await ('formatVersion' in input?validateAuthoringArchive(input):createAuthoringArchive(input)),kind=archive.format;
 const metadata={format:'knolstory-authoring-workbook',version:8,kind,schemaVersion:kind==='knolstory'?archive.document.schemaVersion:1,savedAt:kind==='knolstory'?archive.document.savedAt:archive.project.updatedAt,appVersion:kind==='knolstory'?archive.document.appVersion:'knolstory-next',assetCatalogVersion:kind==='knolstory'?archive.document.assetCatalogVersion:undefined};
 let tables:AuthoringTables;
 if(kind==='knolstory'){
  const p=archive.document.project;
  tables={...exportProjectTables(p),...exportTextVariantTables(p),...exportVisibilityTables(p),...exportBranchTables(p),...exportFlowTables(p),...exportScoreTables(p),...exportStageTables(p),...exportAudioTables(p),...exportPresentationTables(p),...exportCoverTables(p),...exportPreparationTables(p),...exportResources(archive.audioResources)};
 }else{
  const p=archive.project;
  tables={[shortProject.key]:makeTable(shortProject,[{id:p.id,title:p.title,description:p.description,authorDisplayName:p.authorDisplayName,updatedAt:p.updatedAt,backgroundId:p.cover.backgroundId,characterId:p.cover.characterId,authorNote:p.cover.authorNote,sourcePresent:p.source!==undefined,sourceKind:p.source?.kind,presetId:p.source?.presetId}]),[pages.key]:makeTable(pages,p.pages),...exportCoverDesignTables(p.cover.design)};
 }
 return {format:'knolstory-authoring-workbook',formatVersion:8,workKind:kind,tables:{[meta.key]:makeTable(meta,[metadata]),...tables}};
}
/** Explicit pre-score v2 adapter. Missing or partial current tabs never use this path. */
function upgradePreviousWorkbook(input:AuthoringWorkbook):AuthoringWorkbook {
 if(input.formatVersion!==2)return input;
 const tables={...input.tables};
 if(input.workKind==='knolstory'){
  if(SCORE_SPECS.some(spec=>tables[spec.key])||tables.project?.headers.includes('scoresPresent')||tables.flows?.headers.includes('routesPresent')||tables.flowChoices?.headers.some(key=>['conditionPresent','effectsPresent'].includes(key)))throw new WorkbookIssue('형식 정보',3,'버전','점수 편집 항목은 표 버전 3으로 작성하세요.');
  for(const [tableKey,keys] of [['project',['scoresPresent']],['flows',['routesPresent']],['flowChoices',['conditionPresent','effectsPresent']]] as const){const table=tables[tableKey];if(!table)continue;tables[tableKey]={headers:[...table.headers,...keys],rows:table.rows.map(row=>[...row,...keys.map(()=>'없음')])};}
  for(const spec of SCORE_SPECS)tables[spec.key]=makeTable(spec,[]);
 }
 const metadata=tables.metadata;
 if(metadata){const versionIndex=metadata.headers.indexOf('version'),schemaIndex=metadata.headers.indexOf('schemaVersion');tables.metadata={...metadata,rows:metadata.rows.map(row=>{if(row[versionIndex]!=='2'||input.workKind==='knolstory'&&row[schemaIndex]!=='5')throw new WorkbookIssue('형식 정보',3,'버전','이전 양식의 버전 정보가 일치하지 않습니다.');return row.map((value,index)=>index===versionIndex?'3':index===schemaIndex&&input.workKind==='knolstory'?String(CURRENT_SCHEMA_VERSION):value);})};}
 return {...input,formatVersion:3,tables};
}
/** Versions 2/3 stored milliseconds. Convert only declared numeric time columns. */
function upgradeMillisecondsWorkbook(input:AuthoringWorkbook):AuthoringWorkbook {
 if(input.formatVersion!==3)return input;
 const specs=authoringWorkbookSpecs(input.workKind);
 const tables=Object.fromEntries(Object.entries(input.tables).map(([key,table])=>{
  const timeKeys=specs.find(spec=>spec.key===key)?.columns.filter(column=>column.type==='number'&&column.key.endsWith('Ms')).map(column=>column.key)??[];
  return [key,{...table,rows:table.rows.map((row,rowIndex)=>row.map((value,index)=>{
   const column=table.headers[index];
   if(key==='metadata'&&column==='version'){if(value!=='3')throw new WorkbookIssue('형식 정보',rowIndex+3,'표 버전','이전 양식의 버전 정보가 일치하지 않습니다.');return '4';}
   if(!timeKeys.includes(column)||value==='⟪미설정⟫')return value;
   if(!value.trim()||!Number.isFinite(Number(value)))throw new WorkbookIssue(specs.find(spec=>spec.key===key)!.title,rowIndex+3,column,'이전 양식의 밀리초 값이 올바르지 않습니다.');
   return shiftDecimal(String(Number(value)),-3);
  }))}];
 }));
 return {...input,formatVersion:4,tables};
}
/** v4 had no author audio facets. Upgrade only a wholly absent extension. */
function upgradeAudioAttributes(input:AuthoringWorkbook):AuthoringWorkbook {
 if(input.formatVersion!==4)return input;
 const tables={...input.tables};
 if(input.workKind==='knolstory'){
  const table=tables.resources;
  if(tables.resourceTags||table?.headers.some(key=>['metadataPresent','category','originalName','metadataSource'].includes(key)))throw new WorkbookIssue('형식 정보',3,'표 버전','소리 검색 속성은 표 버전 5로 작성하세요.');
  if(table)tables.resources={headers:[...table.headers,'metadataPresent','category','originalName','metadataSource'],rows:table.rows.map(row=>[...row,'없음','⟪미설정⟫','⟪미설정⟫','⟪미설정⟫'])};
  tables.resourceTags=makeTable(tags,[]);
 }
 const metadata=tables.metadata;
 if(metadata){const index=metadata.headers.indexOf('version');tables.metadata={...metadata,rows:metadata.rows.map(row=>{if(row[index]!=='4')throw new WorkbookIssue('형식 정보',3,'표 버전','이전 버전 정보가 일치하지 않습니다.');return row.map((value,i)=>i===index?'5':value);})};}
 return {...input,formatVersion:5,tables};
}
/** v5 had no authored effect duration. Preserve unset defaults; never infer a duration. */
function upgradeEffectDuration(input:AuthoringWorkbook):AuthoringWorkbook {
 if(input.formatVersion!==5)return input;
 const tables={...input.tables};
 if(input.workKind==='knolstory'){
  const table=tables.presentationEffects;
  if(table?.headers.includes('durationMs'))throw new WorkbookIssue('형식 정보',3,'표 버전','효과 재생 시간은 표 버전 6으로 작성하세요.');
  if(table)tables.presentationEffects={headers:[...table.headers,'durationMs'],rows:table.rows.map(row=>[...row,'⟪미설정⟫'])};
 }
 const metadata=tables.metadata;
 if(metadata){const index=metadata.headers.indexOf('version');tables.metadata={...metadata,rows:metadata.rows.map(row=>{if(row[index]!=='5')throw new WorkbookIssue('형식 정보',3,'표 버전','이전 버전 정보가 일치하지 않습니다.');return row.map((value,i)=>i===index?'6':value);})};}
 return {...input,formatVersion:6,tables};
}
/** v6 had no cut-end ranges. Add absent columns without authoring default endpoints. */
function upgradeCutEnds(input:AuthoringWorkbook):AuthoringWorkbook{
 if(input.formatVersion!==6)return input;
 const tables={...input.tables};
 if(input.workKind==='knolstory')for(const key of ['presentationEffects','audioTracks']){const table=tables[key];if(!table)continue;if(table.headers.includes('endLineId')){const ei=table.headers.indexOf('endLineId');if(table.rows.some(row=>row[ei]!=='⟪미설정⟫'))throw new WorkbookIssue('형식 정보',3,'표 버전','종료 컷 범위는 표 버전7로 작성하세요.');continue;}tables[key]={headers:[...table.headers,'endLineId'],rows:table.rows.map(row=>[...row,'⟪미설정⟫'])};}
 const metadata=tables.metadata;if(metadata){const vi=metadata.headers.indexOf('version'),si=metadata.headers.indexOf('schemaVersion');tables.metadata={...metadata,rows:metadata.rows.map(row=>row.map((v,i)=>i===vi?'7':input.workKind==='knolstory'&&i===si?'7':v))};}
 return {...input,formatVersion:7,tables};
}
/** v7 had no choice-path conditions. Reject authored future columns under any old declaration. */
function upgradeBranchConditions(input:AuthoringWorkbook):AuthoringWorkbook{
 if(input.formatVersion!==7)return input;
 const keys=BRANCH_COLUMNS.filter(column=>column.key!=='branchConditionMode').map(column=>column.key),tables={...input.tables};
 if(input.workKind==='knolstory')for(const key of ['presentationEffects','audioTracks','audioSounds']){
  const table=tables[key];if(!table)continue;
  if(!table.headers.some(column=>keys.includes(column)))tables[key]={headers:[...table.headers,...keys],rows:table.rows.map(row=>[...row,'없음','⟪미설정⟫','⟪미설정⟫'])};
 }
 const metadata=tables.metadata;if(metadata){const vi=metadata.headers.indexOf('version'),si=metadata.headers.indexOf('schemaVersion');tables.metadata={...metadata,rows:metadata.rows.map(row=>{if(row[vi]!=='7'||input.workKind==='knolstory'&&row[si]!=='7')throw new WorkbookIssue('형식 정보',3,'버전','이전 버전 정보가 일치하지 않습니다.');return row.map((v,i)=>i===vi?'8':input.workKind==='knolstory'&&i===si?'8':v);})};}
 return {...input,formatVersion:8,tables};
}
export async function importAuthoringWorkbook(input:AuthoringWorkbook):Promise<AuthoringArchive>{
 if(input.formatVersion<8&&(VISIBILITY_SPECS.some(spec=>input.tables[spec.key]?.rows.length)||(()=>{const t=input.tables.cuts,i=t?.headers.indexOf('visibilityPresent')??-1;return i>=0&&t.rows.some(row=>!['false','없음'].includes((row[i]??'').toLowerCase()));})()))throw new WorkbookIssue('컷 표시 조건',0,'버전','컷 표시 조건은 표 버전8에서 작성해 주세요.');
 if(input.formatVersion<8&&(input.tables.branchConditionTerms?.rows.length||['presentationEffects','audioTracks','audioSounds'].some(key=>{const t=input.tables[key],index=t?.headers.indexOf('branchConditionMode')??-1;return index>=0&&t.rows.some(row=>row[index]!=='⟪미설정⟫');})))throw new WorkbookIssue('선택 조건 묶음',0,'버전','선택 조건 묶음은 표 버전8로 작성하세요.');
 if(input.formatVersion<8&&(input.tables.textVariants?.rows.length||input.tables.textVariantConditions?.rows.length))throw new WorkbookIssue('조건별 글',0,'버전','조건별 글은 표 버전8에서 작성해 주세요.');
 if(input.formatVersion<8){
  const keys=BRANCH_COLUMNS.filter(column=>column.key!=='branchConditionMode').map(column=>column.key);
  for(const key of ['presentationEffects','audioTracks','audioSounds']){
   const table=input.tables[key];if(!table||!table.headers.some(column=>keys.includes(column)))continue;
   const missing=keys.some(column=>!table.headers.includes(column));
   const authored=table.rows.some(row=>!['false','없음'].includes((row[table.headers.indexOf(keys[0])]??'').toLowerCase())||keys.slice(1).some(column=>row[table.headers.indexOf(column)]!=='⟪미설정⟫'));
   if(missing||authored)throw new WorkbookIssue('형식 정보',3,'표 버전','선택 갈래 조건은 표 버전8로 작성하세요.');
  }
 }
 const upgraded=upgradeBranchConditions(upgradeCutEnds(upgradeEffectDuration(upgradeAudioAttributes(upgradeMillisecondsWorkbook(upgradePreviousWorkbook(input))))));
 const workbook=upgraded.workKind==='knolstory'?{...upgraded,tables:upgradeVisibilityTables(upgradeBranchGroupTables(upgradeTextVariantTables(upgraded.tables)))}:upgraded;
 if(workbook.format!=='knolstory-authoring-workbook'||workbook.formatVersion!==8||!['knolstory','shortstory'].includes(workbook.workKind))throw new WorkbookIssue(meta.title,0,'버전','지원하지 않는 편집 양식입니다.');
 const specs=authoringWorkbookSpecs(workbook.workKind),unknown=Object.keys(workbook.tables).filter(key=>!specs.some(spec=>spec.key===key));
 if(unknown.length)throw new WorkbookIssue('편집 양식',0,'탭',`지원하지 않는 탭 ${unknown.join(', ')}가 있습니다.`);
 const ms=readTable(workbook.tables,meta);if(ms.length!==1)throw new WorkbookIssue(meta.title,3,'행','정보 행은 한 개여야 합니다.');const m=ms[0];
 if(m.format!==workbook.format||m.version!==workbook.formatVersion||m.kind!==workbook.workKind||m.schemaVersion!==(workbook.workKind==='knolstory'?CURRENT_SCHEMA_VERSION:1))throw new WorkbookIssue(meta.title,3,'버전','형식 정보가 일치하지 않습니다.');
 if(workbook.workKind==='knolstory'){
  let p:StoryProject=readProjectTables(workbook.tables);
  for(const apply of [validateBranchGroupOwners,readFlowTables,readScoreTables,readTextVariantTables,readVisibilityTables,readStageTables,readAudioTables,readPresentationTables,readCoverTables,readPreparationTables])p=apply(workbook.tables,p);
  return createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:p,savedAt:String(m.savedAt),appVersion:String(m.appVersion),...(m.assetCatalogVersion===undefined?{}:{assetCatalogVersion:String(m.assetCatalogVersion)})}),audioResources:readResources(workbook.tables)});
 }
 const rows=readTable(workbook.tables,shortProject);if(rows.length!==1)throw new WorkbookIssue(shortProject.title,3,'행','작품 행은 한 개여야 합니다.');const row=rows[0];
 if(!row.sourcePresent&&(row.sourceKind!==undefined||row.presetId!==undefined))throw new WorkbookIssue(shortProject.title,3,'출처','출처 없음과 작성 내용이 충돌합니다.');
 const project={id:row.id,title:row.title,description:row.description,authorDisplayName:row.authorDisplayName,updatedAt:row.updatedAt,cover:{backgroundId:row.backgroundId,characterId:row.characterId,authorNote:row.authorNote,...(readCoverDesignTables(workbook.tables)?{design:readCoverDesignTables(workbook.tables)}:{})},pages:readTable(workbook.tables,pages).sort((a,b)=>Number(a.order)-Number(b.order)),...(row.sourcePresent?{source:{kind:row.sourceKind,...(row.presetId===undefined?{}:{presetId:row.presetId})}}:{})};
 return createAuthoringArchive({format:'shortstory',project:parseShortStory(project) as ShortStoryProject});
}

/** A real empty writing template: editable tables are the only source of authoring content. */
export async function blankAuthoringArchive(kind:'knolstory'|'shortstory'):Promise<AuthoringArchive>{
 if(kind==='shortstory')return createAuthoringArchive({format:'shortstory',project:{id:'my-picture-book',title:'새 그림책',description:'',authorDisplayName:'',updatedAt:new Date().toISOString(),cover:{backgroundId:'',characterId:'',authorNote:''},pages:[{id:'page-1',order:1,title:'',text:'',backgroundId:'',leftAssetId:'',rightAssetId:''}]}});
 const project:StoryProject={id:'my-story',title:'새 이야기',description:'',updatedAt:new Date().toISOString(),sheetUrl:'',sheetEditable:false,speakerNames:[],creativeMemos:[],planning:{premise:'',structureMode:'free',material:'',theme:'',mainCharacter:'',mainGoal:'',centralProblem:'',stakes:'',endingChange:'',opening:'',middle:'',crisis:'',climax:'',ending:'',characterNotes:'',worldNotes:'',mood:'',openQuestions:'',freeNotes:''},chapters:[{id:'chapter-1',order:1,title:'첫 번째 장',summary:'',purpose:'',mood:'',keyEvents:'',nextChapterIdea:'',storyStageKeys:[],chapterSpeakerNames:[],characterAssetIds:[],backgroundAssetIds:[],backgroundId:'',leftAssetId:'',rightAssetId:''}],lines:[{id:'cut-1',chapterId:'chapter-1',order:1,type:'narration',speaker:'narration',speakerName:'',text:'',backgroundId:'',leftAssetId:'',rightAssetId:'',purposeNote:'',emotionNote:'',directionNote:''}]};
 return createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'knolstory-next'})});
}
