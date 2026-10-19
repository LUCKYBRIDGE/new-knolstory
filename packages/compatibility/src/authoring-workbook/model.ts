import {shiftDecimal} from './time-units';
import {workbookDisplayValue,workbookStoredValue,workbookValueChoices} from './labels';
export type WorkbookScalar=string|number|boolean|undefined;
export type Column=Readonly<{key:string;label:string;type:'text'|'number'|'boolean';optional?:boolean}>;
export type TableSpec=Readonly<{key:string;title:string;columns:readonly Column[]}>;
export type AuthoringTable=Readonly<{headers:readonly string[];rows:readonly (readonly string[])[]}>;
export type AuthoringTables=Readonly<Record<string,AuthoringTable>>;
export type AuthoringWorkbook=Readonly<{format:'knolstory-authoring-workbook';formatVersion:2|3|4|5|6|7|8;workKind:'knolstory'|'shortstory';tables:AuthoringTables}>;
export const UNSET='⟪미설정⟫';
const ESCAPED='⟪문자열⟫';
const origins=new WeakMap<object,{row:number;spec:TableSpec}>();
export function workbookRow(record:object){return origins.get(record)?.row??0;}
export function workbookSheet(record:object,fallback:string){return origins.get(record)?.spec.title??fallback;}
export class WorkbookIssue extends Error {
 constructor(public sheet:string,public row:number,public column:string,message:string){super(`${sheet} · ${row>0?`${row}행`:'구조 확인'} · ${column}: ${message}`);}
}
export function makeTable(spec:TableSpec,records:readonly Readonly<Record<string,WorkbookScalar>>[]):AuthoringTable{
 return {headers:spec.columns.map(column=>column.key),rows:records.map(record=>{
  const unknown=Object.keys(record).filter(key=>!spec.columns.some(column=>column.key===key));
  if(unknown.length)throw new WorkbookIssue(spec.title,0,unknown.join(", "),'편집 열이 없는 항목을 내보낼 수 없습니다.');
  return spec.columns.map(column=>{
  const value=record[column.key];
  if(value===undefined){if(!column.optional)throw new WorkbookIssue(spec.title,0,column.label,'필수 값이 없습니다.');return UNSET;}
  if(typeof value!==(column.type==='text'?'string':column.type))throw new WorkbookIssue(spec.title,0,column.label,'내보내기 값의 형식을 확인해 주세요.');
  const text=workbookDisplayValue(spec,column,column.type==='number'&&column.key.endsWith('Ms')?shiftDecimal(String(value),-3):String(value),record);return column.type==='text'&&(text===UNSET||text.startsWith(ESCAPED))?ESCAPED+text:text;
 });})};
}
export function readTable(tables:AuthoringTables,spec:TableSpec):Record<string,WorkbookScalar>[] {
 const table=tables[spec.key];if(!table)throw new WorkbookIssue(spec.title,1,'탭','필수 탭이 없습니다.');
 const keys=spec.columns.map(c=>c.key);
 if(table.headers.length!==keys.length||new Set(table.headers).size!==keys.length||table.headers.some(key=>!keys.includes(key)))throw new WorkbookIssue(spec.title,2,'헤더','열 이름·중복·누락을 확인해 주세요.');
 return table.rows.flatMap((row,index)=>{
  if(!row.some(cell=>cell!==''))return [];
  if(row.slice(keys.length).some(Boolean))throw new WorkbookIssue(spec.title,index+3,'추가 열','지원하지 않는 작성 내용입니다.');
  const context=Object.fromEntries(table.headers.map((key,i)=>[key,row[i]]));
  const result=Object.fromEntries(spec.columns.map(column=>{
   const input=row[table.headers.indexOf(column.key)]??'';
   const text=workbookStoredValue(spec,column,input,context);
   if(text===UNSET){if(!column.optional)throw new WorkbookIssue(spec.title,index+3,column.label,'필수 값은 미설정으로 둘 수 없습니다.');return [column.key,undefined];}
   if(column.type==='text'){const stored=text.startsWith(ESCAPED)?text.slice(ESCAPED.length):text;const choices=workbookValueChoices(spec,column,context);if(choices.length&&!choices.some(choice=>choice.value===stored))throw new WorkbookIssue(spec.title,index+3,column.label,`안내된 값을 선택해 주세요: ${choices.map(choice=>choice.label).join(' / ')}`);return [column.key,stored];}
   if(column.type==='boolean'){if(!/^(true|false)$/i.test(text))throw new WorkbookIssue(spec.title,index+3,column.label,'있음 또는 없음을 입력해 주세요. (TRUE/FALSE도 가능)');return [column.key,text.toLowerCase()==='true'];}
   if(!text.trim()||!Number.isFinite(Number(text)))throw new WorkbookIssue(spec.title,index+3,column.label,'유한한 숫자를 입력해 주세요.');if(column.key.endsWith('Ms')){if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text))throw new WorkbookIssue(spec.title,index+3,column.label,'시간은 0 이상의 초 단위 소수로 입력해 주세요. 예: 0.1, 0.23');return [column.key,Number(shiftDecimal(text,3))];}return [column.key,Number(text)];
  }));
  origins.set(result,{row:index+3,spec});return [result];
 });
}
export function requireUnique(records:readonly Record<string,WorkbookScalar>[],key:string,sheet:string):void{
 const seen=new Set<string>();
 for(const record of records){
  const id=record[key];
  if(typeof id!=='string'||!id.trim()||seen.has(id))throw new WorkbookIssue(workbookSheet(record,sheet),workbookRow(record),origins.get(record)?.spec.columns.find(column=>column.key===key)?.label??key,'ID가 비어 있거나 중복되었습니다.');
  seen.add(id);
 }
}
