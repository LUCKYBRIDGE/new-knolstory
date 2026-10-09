import type { StoryDocumentEnvelope } from '@knolstory/story-domain';
import { exportStoryTable, importStoryTable, TABLE_MAX_BYTES, TABLE_CELL_LIMIT } from './story-table';
import { exportShortStoryTable, importShortStoryTable, type ShortStoryProject } from './shortstory';
/** Browser-compatible ExcelJS document API, loaded only when an Excel action is invoked. */
async function workbook() {
  const excel = await import('exceljs');
  return new excel.default.Workbook();
}
export async function exportTableExcel(rows: readonly (readonly string[])[]):Promise<Uint8Array> {
  if(rows.some(row=>row.some(cell=>cell.length>TABLE_CELL_LIMIT)))throw new Error('Excel의 한 셀에는 30,000자 이하로 입력해 주세요.');
  const book=await workbook();const sheet=book.addWorksheet('KnolStory Next');
  for(const row of rows)sheet.addRow([...row]);
  sheet.getRow(2).font={bold:true};sheet.views=[{state:'frozen',ySplit:2}];
  sheet.columns=[{width:16},{width:30},{width:30},{width:10},{width:28},{width:22},{width:65}];
  return new Uint8Array(await book.xlsx.writeBuffer());
}
function checkExcelArchive(bytes:Uint8Array):void {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let footer=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) { if(view.getUint32(i,true)===0x06054b50){footer=i;break;} }
  if(footer<0)throw new Error('Excel ZIP 자료를 확인해 주세요.');
  const count=view.getUint16(footer+10,true), offset=view.getUint32(footer+16,true);
  if(count>2000||offset>footer)throw new Error('Excel 자료가 너무 복잡하거나 손상되었습니다.');
  let cursor=offset,total=0;
  for(let i=0;i<count;i++){
    if(cursor+46>footer||view.getUint32(cursor,true)!==0x02014b50)throw new Error('Excel ZIP 목록이 손상되었습니다.');
    total+=view.getUint32(cursor+24,true);
    if(total>100*1024*1024)throw new Error('압축을 푼 Excel 자료는 100MB 이하로 선택하세요.');
    cursor+=46+view.getUint16(cursor+28,true)+view.getUint16(cursor+30,true)+view.getUint16(cursor+32,true);
  }
}
export async function importTableExcel(bytes:Uint8Array):Promise<string[][]> {
  if(!bytes.length||bytes.length>TABLE_MAX_BYTES)throw new Error('Excel 파일은 25MB 이하로 선택하세요.');
  checkExcelArchive(bytes);
  const book=await workbook();
  try{await book.xlsx.load(bytes as never);}catch{throw new Error('Excel 파일을 읽지 못했습니다. .xlsx 파일을 선택하세요.');}
  const sheet=book.getWorksheet('KnolStory Next');
  if(!sheet||book.worksheets.length!==1)throw new Error('Next 표 형식의 KnolStory Next 시트 하나가 필요해요.');
  const rows:string[][]=[];let total=0;
  sheet.eachRow({includeEmpty:false},row=>{
    const cells:string[]=[];
    row.eachCell({includeEmpty:true},(cell,column)=>{
      const value=cell.value;
      if(value&&typeof value==='object'&&'formula'in value)throw new Error('수식 대신 값으로 붙여넣은 표를 사용하세요.');
      const text=value===null||value===undefined?'':typeof value==='string'||typeof value==='number'||typeof value==='boolean'?String(value):cell.text;
      if(text.length>TABLE_CELL_LIMIT)throw new Error('Excel 셀이 너무 큽니다.');
      cells[column-1]=text;total+=text.length;
      if(total>TABLE_MAX_BYTES)throw new Error('Excel 표 자료가 너무 큽니다.');
    });rows.push(cells);
  });
  return rows;
}
export async function exportStoryExcel(document:StoryDocumentEnvelope,audioResources:readonly unknown[]=[]){return exportTableExcel(exportStoryTable(document,audioResources));}
export async function importStoryExcel(bytes:Uint8Array){return importStoryTable(await importTableExcel(bytes));}
export async function exportShortStoryExcel(project:ShortStoryProject){return exportTableExcel(exportShortStoryTable(project));}
export async function importShortStoryExcel(bytes:Uint8Array){return importShortStoryTable(await importTableExcel(bytes));}
