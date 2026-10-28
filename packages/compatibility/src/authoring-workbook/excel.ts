import {fontRunText} from './font-runs';
import assetCatalog from '../../../asset-registry/src/catalog.json';
import {AUDIO_CATALOG,audioAssetCategory} from '../../../asset-registry/src/audio';
import {createExcelWorkbook,checkExcelArchive} from '../excel';
import {TABLE_CELL_LIMIT,TABLE_MAX_BYTES} from '../story-table';
import type {AuthoringArchive,AuthoringArchiveInput} from '../authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook,authoringWorkbookSpecs} from './index';
import {workbookGuideRows,columnHelp} from './guide';
import {columnApplication} from './application-help';
import {workbookValueChoices,workbookStoredValue} from './labels';
import {readTable,WorkbookIssue,type AuthoringTables,type TableSpec,type AuthoringTable} from './model';
function portableCellText(text:string,sheet:string,row:number,column:string){
 for(let index=0;index<text.length;index++){
  const code=text.charCodeAt(index);
  if(code<32&&![9,10,13].includes(code)||code>=0xdc00&&code<=0xdfff)throw new WorkbookIssue(sheet,row,column,'표에서 보존할 수 없는 문자가 있습니다. 원본을 유지하고 작품 파일로 보관해 주세요.');
  if(code>=0xd800&&code<=0xdbff){const next=text.charCodeAt(++index);if(!(next>=0xdc00&&next<=0xdfff))throw new WorkbookIssue(sheet,row,column,'올바르지 않은 Unicode 문자가 있습니다. 원본은 유지됩니다.');}
 }
}
function cellLimit(spec:TableSpec,rows:readonly(readonly string[])[]){
 for(const [i,row]of rows.entries())for(const [j,text]of row.entries()){portableCellText(text,spec.title,i+3,spec.columns[j]?.label??'추가 열');if(text.length>TABLE_CELL_LIMIT)throw new WorkbookIssue(spec.title,i+3,spec.columns[j]?.label??'추가 열','한 셀은 30,000자 이하여야 합니다. 작품 파일로 보관해 주세요.');}
}
export async function exportAuthoringExcel(input:AuthoringArchiveInput|AuthoringArchive):Promise<Uint8Array>{
 const authoring=await exportAuthoringWorkbook(input),book=await createExcelWorkbook();
 const guide=book.addWorksheet('사용 안내');for(const row of workbookGuideRows(authoringWorkbookSpecs(authoring.workKind)))guide.addRow(row);guide.columns=[{width:30},{width:40},{width:90}];guide.views=[{state:'frozen',ySplit:1}];guide.eachRow(row=>row.eachCell(cell=>{cell.numFmt='@';cell.alignment={vertical:'top',wrapText:true};}));guide.getRow(1).font={bold:true};
 const reference=book.addWorksheet('작품 자료 참고');
 reference.addRow(['작품 자료 ID (작품 연결 값)','이름','종류','관련 작품','사용 안내']);
 for(const asset of assetCatalog)reference.addRow([asset.id,asset.label,asset.type==='background'?'배경 그림':'인물 그림',asset.story,asset.usage]);
 if(authoring.workKind==='knolstory')for(const asset of AUDIO_CATALOG)reference.addRow([asset.id,asset.name,({background:'배경음',ambience:'주변 소리(환경음)',effect:'효과음'})[audioAssetCategory(asset)],'공통 음원','음원 ID를 배경음·주변 소리 또는 효과음에 입력']);
 reference.columns=[{width:60},{width:40},{width:18},{width:24},{width:42}];reference.views=[{state:'frozen',ySplit:1}];reference.autoFilter={from:'A1',to:`E${reference.rowCount}`};reference.eachRow(row=>row.eachCell(cell=>{cell.numFmt='@';cell.alignment={vertical:'top',wrapText:true};}));reference.getRow(1).font={bold:true};reference.getCell('A1').note='서비스에 등록된 작품 자료의 참고 목록입니다. 이름을 찾아 ID를 복사하세요. 이 탭을 수정해 새 작품 자료를 등록할 수는 없습니다. 등록된 그림 ID는 쪽·표지·무대에, 등록된 음원 ID는 장·컷 소리에 연결합니다. 외부 그림·음원 업로드는 제공하지 않습니다. 기존 저장 작품의 첨부 원본은 파일 보관 시 보존합니다.';
 for(const spec of authoringWorkbookSpecs(authoring.workKind)){
  const table=authoring.tables[spec.key];cellLimit(spec,table.rows);
  const sheet=book.addWorksheet(spec.title);sheet.addRow(spec.columns.map(c=>c.label));sheet.addRow(table.headers);for(const row of table.rows)sheet.addRow([...row]);
  sheet.views=[{state:'frozen',ySplit:2}];
  sheet.getRow(2).hidden=true;
  sheet.getRow(1).font={name:'Malgun Gothic',bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).height=Math.max(28,...spec.columns.map(column=>{const width=/본문|이야기|설명|노트|내용|글/.test(column.label)?48:/ID|키|시각/.test(column.label)?28:20;const units=[...column.label].reduce((sum,char)=>sum+(/[^\x00-\x7f]/.test(char)?2:1),0);return Math.ceil(units/(width-2))*14+8;}));
  sheet.getRow(1).eachCell((cell,index)=>{const column=spec.columns[index-1];cell.note=`${columnApplication(spec,column)}\n${column.optional?'선택 입력: 미설정 가능':'필수 입력'}\n입력 방법: ${columnHelp(column,spec)}\n자동 연결 키: ${column.key}`;cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF173D35'}};cell.alignment={vertical:'middle',wrapText:true};});
  sheet.getRow(2).font={size:10,color:{argb:'FF62716B'}};
  for(const [index,column] of spec.columns.entries()){
   const choices=workbookValueChoices(spec,column).map(choice=>choice.label);
   if(column.optional&&choices.length)choices.push('⟪미설정⟫');
   if(!choices.length||choices.join(',').length>250)continue;
   for(let row=3;row<=Math.max(23,sheet.rowCount);row++)sheet.getCell(row,index+1).dataValidation={type:'list',allowBlank:column.optional??false,formulae:[`"${choices.join(',')}"`],showErrorMessage:true,errorTitle:'허용 값 확인',error:'목록의 한글 값을 선택해 주세요.',showInputMessage:true,promptTitle:column.label,prompt:columnApplication(spec,column).slice(0,250)};
  }
  sheet.columns=spec.columns.map(c=>({width:/본문|이야기|설명|노트|내용|글/.test(c.label)?48:/ID|키|시각/.test(c.label)?28:20}));
  sheet.eachRow((row,i)=>{if(i<3)return;row.eachCell(cell=>{cell.numFmt='@';cell.alignment={vertical:'top',wrapText:true};cell.font={name:'Malgun Gothic',color:{argb:'FF183331'}};});});
 }
 const bytes=new Uint8Array(await book.xlsx.writeBuffer());if(bytes.byteLength>TABLE_MAX_BYTES)throw new Error('편집 양식 파일은 25MB 이하여야 합니다.');return bytes;
}
function values(sheet:ReturnType<Awaited<ReturnType<typeof createExcelWorkbook>>['getWorksheet']>):AuthoringTable{
 if(!sheet)throw new Error('편집 양식 탭이 없습니다.');
 if(sheet.rowCount>100000||sheet.columnCount>200)throw new WorkbookIssue(sheet.name,0,'크기','탭은100,000행·200열 이하여야 합니다.');
 const headers:string[]=[],rows:string[][]=[];let total=0;
 const text=(value:unknown,row:number,column:number):string=>{
  if(value===null||value===undefined)return '';
  if(typeof value==='object'&&'hyperlink' in value){
   const link=value as Record<string,unknown>;
   if(Object.keys(link).some(key=>!['text','hyperlink','tooltip'].includes(key))||typeof link.text!=='string'||link.text!==link.hyperlink||!/^https?:\/\//.test(link.text))throw new WorkbookIssue(sheet.name,row,String(column),'표시 문구와 링크 주소가 다른 링크는 작품 값으로 보존할 수 없습니다. 주소 자체를 입력해 주세요.');
   value=link.text;
  }
  const fontText=fontRunText(value);if(fontText!==undefined)value=fontText;
  if(typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')throw new WorkbookIssue(sheet.name,row,String(column),'수식·날짜·글자별 서식 대신 원래 양식의 일반 값을 사용해 주세요.');
  const result=String(value);portableCellText(result,sheet.name,row,String(column));if(result.length>TABLE_CELL_LIMIT)throw new WorkbookIssue(sheet.name,row,String(column),'셀 내용이 너무 큽니다.');total+=result.length;if(total>TABLE_MAX_BYTES)throw new Error('편집 양식 내용이 너무 큽니다.');return result;
 };
 sheet.getRow(2).eachCell({includeEmpty:true},(cell,column)=>{headers[column-1]=text(cell.value,2,column);});
 for(let i=3;i<=sheet.rowCount;i++){const row:string[]=[];sheet.getRow(i).eachCell({includeEmpty:true},(cell,column)=>{row[column-1]=text(cell.value,i,column);});if(row.some(Boolean))rows.push(row);}
 while(headers.length&&headers.at(-1)==='')headers.pop();
 return {headers:Array.from(headers,v=>v??''),rows:rows.map(row=>Array.from(row,v=>v??''))};
}
export async function importAuthoringExcel(bytes:Uint8Array):Promise<AuthoringArchive>{
 if(!bytes.length||bytes.length>TABLE_MAX_BYTES)throw new Error('편집 양식은 25MB 이하의 .xlsx 파일을 선택해 주세요.');checkExcelArchive(bytes);
 const book=await createExcelWorkbook();try{await book.xlsx.load(bytes as never);}catch{throw new Error('Excel 편집 양식을 읽지 못했습니다.');}
 return importLoadedAuthoringExcel(book);
}
/** Reuse an already parsed workbook for Web format detection; content validation stays identical. */
export async function importLoadedAuthoringExcel(book:Awaited<ReturnType<typeof createExcelWorkbook>>):Promise<AuthoringArchive>{
 const metadata=values(book.getWorksheet('형식 정보'));
 const metadataSpec=authoringWorkbookSpecs('knolstory')[0];
 const kind=workbookStoredValue(metadataSpec,metadataSpec.columns.find(c=>c.key==='kind')!,metadata.rows[0]?.[metadata.headers.indexOf('kind')]??'');if(kind!=='knolstory'&&kind!=='shortstory')throw new WorkbookIssue('형식 정보',3,'작품 종류','작품 종류를 확인해 주세요.');
 const specs=authoringWorkbookSpecs(kind);
 const previousTitles:Readonly<Record<string,string>>={'소리 설정':'오디오 설정','배경음·주변 소리':'음악 환경음','인물 배치':'무대 구성','배치한 인물':'무대 인물','말하는 인물':'무대 화자'};
 const unknown=book.worksheets.filter(sheet=>!['사용 안내','작품 자료 참고','자산 참고'].includes(sheet.name)&&!specs.some(spec=>spec.title===sheet.name||previousTitles[spec.title]===sheet.name));
 if(unknown.some(sheet=>sheet.rowCount>0))throw new WorkbookIssue('편집 양식',0,'탭','지원하지 않는 작성 탭이 있습니다. 원본을 보존하고 가져오기를 중단했습니다.');
 const tables:Record<string,AuthoringTable>={};for(const spec of specs){const current=book.getWorksheet(spec.title),previous=previousTitles[spec.title]?book.getWorksheet(previousTitles[spec.title]):undefined;if(current&&previous)throw new WorkbookIssue(spec.title,0,'탭','같은 항목의 이전 이름·현재 이름 탭이 중복되었습니다.');const sheet=current??previous;if(sheet)tables[spec.key]=values(sheet);}
 const version=Number(metadata.rows[0]?.[metadata.headers.indexOf('version')]);if(version!==2&&version!==3&&version!==4&&version!==5&&version!==6&&version!==7&&version!==8)throw new WorkbookIssue('형식 정보',3,'표 버전','지원하지 않는 편집 양식 버전입니다.');
 readTable(tables as AuthoringTables,specs[0]);
 return importAuthoringWorkbook({format:'knolstory-authoring-workbook',formatVersion:version,workKind:kind,tables});
}
