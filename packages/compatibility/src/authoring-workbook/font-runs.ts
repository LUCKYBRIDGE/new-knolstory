type RecordValue=Record<string,unknown>;
function record(value:unknown):value is RecordValue{return value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}
const substitution=new Set(['name','family','charset','scheme']);
const booleans=new Set(['bold','italic','strike','outline']);
const underline=new Set(['none','single','double','singleAccounting','doubleAccounting']);
function fontValue(key:string,value:unknown):boolean{
 if(key==='name')return typeof value==='string';
 if(key==='family'||key==='charset')return typeof value==='number'&&Number.isInteger(value)&&value>=0;
 if(key==='scheme')return value==='minor'||value==='major'||value==='none';
 if(key==='size')return typeof value==='number'&&Number.isFinite(value)&&value>0;
 if(booleans.has(key))return typeof value==='boolean';
 if(key==='underline')return typeof value==='boolean'||typeof value==='string'&&underline.has(value);
 if(key==='vertAlign')return value==='superscript'||value==='subscript';
 if(key==='color')return record(value)&&Object.entries(value).every(([kind,color])=>kind==='argb'?typeof color==='string'&&/^[\da-f]{8}$/i.test(color):(kind==='theme'||kind==='indexed')&&typeof color==='number'&&Number.isInteger(color)&&color>=0);
 return false;
}
function fontStyle(value:unknown):string|undefined{
 if(value===undefined)return '{}';
 if(!record(value)||!Object.entries(value).every(([key,item])=>fontValue(key,item)))return undefined;
 return JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>!substitution.has(key)).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,key==='color'?Object.fromEntries(Object.entries(item as RecordValue).sort(([a],[b])=>a.localeCompare(b))):item])));
}
/** Spreadsheet font fallback may split one plain string without adding text semantics. */
export function fontRunText(value:unknown):string|undefined{
 if(!record(value)||Object.keys(value).length!==1||!Array.isArray(value.richText))return undefined;
 const runs=value.richText;
 if(Object.keys(runs).length!==runs.length)return undefined;
 const parts=runs.map((run:unknown)=>{
  if(!record(run)||Object.keys(run).some(key=>key!=='text'&&key!=='font')||typeof run.text!=='string')return undefined;
  const style=fontStyle(run.font);return style===undefined?undefined:{text:run.text,style};
 });
 if(parts.some(part=>part===undefined))return undefined;
 const valid=parts as {text:string;style:string}[];
 const styles=valid.filter(part=>part.text.length>0).map(part=>part.style);
 if(new Set(styles).size>1)return undefined;
 return valid.map(part=>part.text).join('');
}
