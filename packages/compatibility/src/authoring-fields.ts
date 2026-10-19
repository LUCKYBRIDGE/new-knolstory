import schemas from './authoring-field-schema.json';
export type AuthoringSchema=Readonly<{kind:string;value?:unknown;variants?:AuthoringSchema[];element?:AuthoringSchema;properties?:Record<string,AuthoringSchema>;required?:string[]}>;
export function authoringSchema(format:'knolstory'|'shortstory'):AuthoringSchema{return schemas[format] as AuthoringSchema;}
/** Inspect before normalization: unsupported authored values are errors, never discarded. */
export function authoringFieldIssues(schema:AuthoringSchema,value:unknown,path='$',depth=0):string[]{
 if(depth>40)return [`${path}: 작성 데이터가 너무 깊습니다.`];
 if(schema.kind==='union'){
  const matching=schema.variants!.filter(variant=>variant.kind==='object'?!!value&&typeof value==='object'&&!Array.isArray(value):variant.kind==='array'?Array.isArray(value):variant.kind==='undefined'?value===undefined:variant.kind==='null'?value===null:variant.kind==='literal'?typeof value===typeof variant.value:typeof value===variant.kind);
  const candidates=(matching.length?matching:schema.variants!).map(variant=>authoringFieldIssues(variant,value,path,depth+1));
  if(candidates.some(issues=>!issues.length))return [];
  return candidates.sort((a,b)=>a.length-b.length)[0];
 }
 if(schema.kind==='literal')return value===schema.value?[]:[`${path}: 허용 값은 ${String(schema.value)}입니다.`];
 if(schema.kind==='undefined'||schema.kind==='null')return value===(schema.kind==='null'?null:undefined)?[]:[`${path}: 값의 형식을 확인해 주세요.`];
 if(['string','number','boolean'].includes(schema.kind))return typeof value===schema.kind&&(schema.kind!=='number'||Number.isFinite(value))?[]:[`${path}: ${schema.kind} 형식의 값이 필요합니다.`];
 if(schema.kind==='array')return Array.isArray(value)?value.flatMap((item,index)=>authoringFieldIssues(schema.element!,item,`${path}[${index}]`,depth+1)):[`${path}: 목록 형식이 필요합니다.`];
 if(schema.kind==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))return [`${path}: 항목 형식이 필요합니다.`];
  const record=value as Record<string,unknown>,properties=schema.properties!;
  return [...schema.required!.filter(key=>!Object.hasOwn(record,key)).map(key=>`${path}.${key}: 필수 항목이 없습니다.`),...Object.entries(record).flatMap(([key,item])=>properties[key]?authoringFieldIssues(properties[key],item,`${path}.${key}`,depth+1):[`${path}.${key}: 지원하지 않는 작성 항목입니다.`])];
 }
 return [`${path}: 지원하지 않는 형식입니다.`];
}
export function assertAuthoringFields(format:'knolstory'|'shortstory',project:unknown):void{
 const issues=authoringFieldIssues(authoringSchema(format),project);
 if(issues.length)throw new Error(issues.slice(0,50).join('\n'));
}
