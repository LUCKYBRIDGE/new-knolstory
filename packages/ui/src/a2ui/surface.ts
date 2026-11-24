// A2UI v0.9 messages and a validator for KnolStory's focus editor catalog.
// The catalog JSON is the single source; this file interprets the JSON Schema subset it uses
// (const/enum/type/required/minItems/maxItems/uniqueItems/maxLength/$ref) plus A2UI's
// allowedParents and the screen rules the schema cannot express (one primary, one way per job).
import catalogJson from './focus-editor-catalog.json' with {type:'json'};

export const A2UI_VERSION='v0.9';

type JsonSchema={
 type?:string;const?:unknown;enum?:readonly unknown[];$ref?:string;
 properties?:Record<string,JsonSchema>;required?:readonly string[];additionalProperties?:boolean;
 items?:JsonSchema;minItems?:number;maxItems?:number;uniqueItems?:boolean;maxLength?:number;
 allowedParents?:readonly string[];description?:string;
};
export type A2uiCatalog={catalogId:string;instructions:string;$defs:Record<string,JsonSchema>;components:Record<string,JsonSchema>;functions:Record<string,unknown>};
export const focusEditorCatalog=catalogJson as unknown as A2uiCatalog;
export type FocusComponentName=keyof typeof catalogJson.components;
export const focusComponentNames=Object.keys(focusEditorCatalog.components) as FocusComponentName[];

export type DataBinding={path:string};
export type A2uiAction={event:{name:string;context?:Record<string,unknown>}}|{functionCall:{call:string;args?:Record<string,unknown>}};
export type A2uiComponent={id:string;component:string;[prop:string]:unknown};
export type A2uiMessage=
 |{version:'v0.9';createSurface:{surfaceId:string;catalogId:string;sendDataModel?:boolean}}
 |{version:'v0.9';updateComponents:{surfaceId:string;components:A2uiComponent[]}}
 |{version:'v0.9';updateDataModel:{surfaceId:string;path?:string;value?:unknown}}
 |{version:'v0.9';deleteSurface:{surfaceId:string}};

export type Device='phone'|'phoneLandscape'|'tablet'|'desktop';
export const DEVICES:readonly Device[]=['phone','phoneLandscape','tablet','desktop'];

export type Surface={surfaceId:string;catalogId:string;components:Map<string,A2uiComponent>;data:Record<string,unknown>};

/** Applies A2UI messages in order and returns the resulting surfaces. */
export function applyMessages(messages:readonly A2uiMessage[],surfaces=new Map<string,Surface>()){
 for(const message of messages){
  if(message.version!==A2UI_VERSION)throw new Error(`지원하지 않는 A2UI 버전: ${String((message as {version?:unknown}).version)}`);
  if('createSurface' in message){
   const {surfaceId,catalogId}=message.createSurface;
   surfaces.set(surfaceId,{surfaceId,catalogId,components:new Map(),data:{}});
  }else if('updateComponents' in message){
   const surface=requireSurface(surfaces,message.updateComponents.surfaceId);
   for(const component of message.updateComponents.components)surface.components.set(component.id,component);
  }else if('updateDataModel' in message){
   const surface=requireSurface(surfaces,message.updateDataModel.surfaceId);
   const {path='/',value}=message.updateDataModel;
   surface.data=setPointer(surface.data,path,value) as Record<string,unknown>;
  }else{
   surfaces.delete(message.deleteSurface.surfaceId);
  }
 }
 return surfaces;
}

function requireSurface(surfaces:Map<string,Surface>,surfaceId:string){
 const surface=surfaces.get(surfaceId);
 if(!surface)throw new Error(`createSurface 없이 쓴 화면: ${surfaceId}`);
 return surface;
}

function pointerParts(path:string){
 if(path===''||path==='/')return [];
 if(!path.startsWith('/'))throw new Error(`JSON Pointer는 /로 시작해요: ${path}`);
 return path.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
}

export function readPointer(data:unknown,path:string):unknown{
 let node=data;
 for(const part of pointerParts(path)){
  if(node===null||typeof node!=='object')return undefined;
  node=(node as Record<string,unknown>)[part];
 }
 return node;
}

function setPointer(data:unknown,path:string,value:unknown):unknown{
 const parts=pointerParts(path);
 if(!parts.length)return value===undefined?{}:value;
 const root:Record<string,unknown>=data&&typeof data==='object'?{...data as Record<string,unknown>}:{};
 let node=root;
 parts.slice(0,-1).forEach(part=>{
  const next=node[part];
  node[part]=next&&typeof next==='object'?{...next as Record<string,unknown>}:{};
  node=node[part] as Record<string,unknown>;
 });
 const last=parts[parts.length-1];
 if(value===undefined)delete node[last];else node[last]=value;
 return root;
}

export type SurfaceIssue={id:string;rule:string;message:string};

/** Checks a surface against the catalog and the focus-screen rules. Returns [] when valid. */
export function validateSurface(surface:Surface,catalog:A2uiCatalog=focusEditorCatalog):SurfaceIssue[]{
 const issues:SurfaceIssue[]=[];
 const add=(id:string,rule:string,message:string)=>issues.push({id,rule,message});
 if(surface.catalogId!==catalog.catalogId)add(surface.surfaceId,'catalog',`다른 카탈로그: ${surface.catalogId}`);
 const parents=new Map<string,string>();
 for(const component of surface.components.values()){
  const schema=catalog.components[component.component];
  if(!schema){add(component.id,'unknown-component',`카탈로그에 없는 컴포넌트: ${component.component}`);continue;}
  checkObject(component,schema,catalog,component.id,'',add,true);
  for(const childId of childIds(component,schema)){
   const child=surface.components.get(childId);
   if(!child){add(component.id,'missing-child',`없는 자식 ${childId}`);continue;}
   const previous=parents.get(childId);
   if(previous)add(childId,'one-parent',`${previous}와 ${component.id} 두 곳에 들어 있어요`);
   parents.set(childId,component.id);
   const allowed=catalog.components[child.component]?.allowedParents;
   if(allowed&&!allowed.includes(component.component))add(childId,'allowed-parents',`${child.component}는 ${component.component} 안에 둘 수 없어요`);
  }
 }
 const root=surface.components.get('root');
 if(!root)add(surface.surfaceId,'root','id가 root인 컴포넌트가 없어요');
 else if(root.component!=='FocusScreen')add('root','root','root는 FocusScreen이어야 해요');
 for(const id of surface.components.keys())if(id!=='root'&&!parents.has(id))add(id,'orphan','어디에도 들어 있지 않아요');
 if(root)checkCycles(surface,catalog,add);
 if(root?.component==='FocusScreen')checkScreenRules(surface,root,catalog,add);
 return issues;
}

/** Ids referenced by ComponentId/ChildList props, in schema property order. */
export function childIds(component:A2uiComponent,schema:JsonSchema|undefined=focusEditorCatalog.components[component.component]){
 const ids:string[]=[];
 for(const [prop,propSchema] of Object.entries(schema?.properties??{})){
  const value=component[prop];
  if(value===undefined)continue;
  const ref=refName(propSchema);
  if(ref==='ComponentId'&&typeof value==='string')ids.push(value);
  if(ref==='ChildList'&&Array.isArray(value))ids.push(...value.filter((id):id is string=>typeof id==='string'));
  if(ref==='ChildList'&&value&&typeof value==='object'&&!Array.isArray(value))ids.push(String((value as {componentId?:unknown}).componentId));
 }
 return ids;
}

function refName(schema:JsonSchema){return schema.$ref?.split('/').pop();}

type Add=(id:string,rule:string,message:string)=>void;

function checkObject(value:Record<string,unknown>,schema:JsonSchema,catalog:A2uiCatalog,id:string,at:string,add:Add,component=false){
 for(const key of schema.required??[])if(value[key]===undefined)add(id,'required',`${at}${key}가 필요해요`);
 for(const [key,propValue] of Object.entries(value)){
  if(component&&key==='id'||propValue===undefined)continue;
  const propSchema=schema.properties?.[key];
  if(!propSchema){if(component||schema.additionalProperties===false)add(id,'unknown-prop',`${at}${key}는 카탈로그에 없는 속성이에요`);continue;}
  checkValue(propValue,propSchema,catalog,id,`${at}${key}`,add);
 }
}

function checkValue(value:unknown,schema:JsonSchema,catalog:A2uiCatalog,id:string,at:string,add:Add){
 const ref=refName(schema);
 if(schema.$ref?.startsWith('#/$defs/')&&ref){
  const local=catalog.$defs[ref];
  checkValue(value,{...local,...withoutRef(schema)},catalog,id,at,add);
  return;
 }
 if(ref){checkCommon(value,ref,schema,id,at,add);return;}
 if('const' in schema&&value!==schema.const)add(id,'const',`${at}는 ${String(schema.const)}이어야 해요`);
 if(schema.enum&&!schema.enum.includes(value))add(id,'enum',`${at}: ${JSON.stringify(value)}는 ${schema.enum.join('·')} 중 하나여야 해요`);
 if(schema.type&&!typeMatches(value,schema.type)){add(id,'type',`${at}는 ${schema.type}여야 해요`);return;}
 if(typeof value==='string')checkLength(value,schema,id,at,add);
 if(Array.isArray(value)){
  checkCount(value,schema,id,at,add);
  if(schema.uniqueItems&&new Set(value.map(item=>JSON.stringify(item))).size!==value.length)add(id,'unique',`${at}에 같은 값이 두 번 있어요`);
  if(schema.items)value.forEach((item,index)=>checkValue(item,schema.items!,catalog,id,`${at}[${index}]`,add));
 }
 if(schema.type==='object'&&value&&typeof value==='object'&&!Array.isArray(value))checkObject(value as Record<string,unknown>,schema,catalog,id,`${at}.`,add);
}

function withoutRef(schema:JsonSchema){const {$ref:_ref,...rest}=schema;return rest;}

function typeMatches(value:unknown,type:string){
 if(type==='integer')return Number.isInteger(value);
 if(type==='array')return Array.isArray(value);
 if(type==='object')return !!value&&typeof value==='object'&&!Array.isArray(value);
 return typeof value===type;
}

function checkLength(value:string,schema:JsonSchema,id:string,at:string,add:Add){
 if(schema.maxLength!==undefined&&[...value].length>schema.maxLength)add(id,'max-length',`${at}가 ${schema.maxLength}자를 넘어요: ${value}`);
}

function checkCount(value:unknown[],schema:JsonSchema,id:string,at:string,add:Add){
 if(schema.minItems!==undefined&&value.length<schema.minItems)add(id,'min-items',`${at}는 ${schema.minItems}개 이상이어야 해요`);
 if(schema.maxItems!==undefined&&value.length>schema.maxItems)add(id,'max-items',`${at}는 ${schema.maxItems}개까지예요`);
}

const isBinding=(value:unknown)=>!!value&&typeof value==='object'&&typeof (value as {path?:unknown}).path==='string'&&Object.keys(value).length===1;
const isCall=(value:unknown)=>!!value&&typeof value==='object'&&typeof (value as {call?:unknown}).call==='string';

function checkCommon(value:unknown,ref:string,schema:JsonSchema,id:string,at:string,add:Add){
 const literal:Record<string,string>={DynamicString:'string',DynamicNumber:'number',DynamicBoolean:'boolean'};
 if(ref in literal){
  if(typeof value===literal[ref]){if(typeof value==='string')checkLength(value,schema,id,at,add);return;}
  if(!isBinding(value)&&!isCall(value))add(id,'type',`${at}는 ${literal[ref]} 값이나 {path} 연결이어야 해요`);
  return;
 }
 if(ref==='ComponentId'){if(typeof value!=='string')add(id,'type',`${at}는 컴포넌트 id여야 해요`);return;}
 if(ref==='DataBinding'){if(!isBinding(value))add(id,'type',`${at}는 {path} 연결이어야 해요`);return;}
 if(ref==='ChildList'){
  if(Array.isArray(value)){
   if(value.some(item=>typeof item!=='string'))add(id,'type',`${at}는 컴포넌트 id 목록이어야 해요`);
   checkCount(value,schema,id,at,add);
  }else if(!value||typeof value!=='object'||typeof (value as {componentId?:unknown}).componentId!=='string'||typeof (value as {path?:unknown}).path!=='string')add(id,'type',`${at}는 id 목록이나 {componentId, path}여야 해요`);
  return;
 }
 if(ref==='Action'){
  const event=(value as {event?:{name?:unknown}}|null)?.event;
  const call=(value as {functionCall?:unknown}|null)?.functionCall;
  if(!(event&&typeof event.name==='string')&&!isCall(call))add(id,'type',`${at}는 {event:{name}} 또는 {functionCall} 동작이어야 해요`);
  return;
 }
 add(id,'unknown-ref',`${at}: 모르는 공통 타입 ${ref}`);
}

function checkCycles(surface:Surface,catalog:A2uiCatalog,add:Add){
 const state=new Map<string,'visiting'|'done'>();
 const visit=(id:string)=>{
  if(state.get(id)==='done')return;
  if(state.get(id)==='visiting'){add(id,'cycle','자기 자신을 다시 품고 있어요');return;}
  state.set(id,'visiting');
  const component=surface.components.get(id);
  if(component)for(const child of childIds(component,catalog.components[component.component]))visit(child);
  state.set(id,'done');
 };
 visit('root');
}

/** Devices on which a component is shown, narrowed by every ancestor's devices. */
export function effectiveDevices(surface:Surface,id:string):Device[]{
 const parents=new Map<string,string>();
 for(const component of surface.components.values())for(const child of childIds(component))parents.set(child,component.id);
 let devices=new Set<Device>(DEVICES);
 const visited=new Set<string>();
 for(let current:string|undefined=id;current&&!visited.has(current);current=parents.get(current)){
  visited.add(current);
  const own=surface.components.get(current)?.devices;
  if(Array.isArray(own))devices=new Set([...devices].filter(device=>own.includes(device)));
 }
 return [...devices];
}

const actionKey=(action:unknown)=>{
 const event=(action as {event?:{name:string;context?:unknown}})?.event;
 if(event)return `event:${event.name}:${JSON.stringify(event.context??{})}`;
 return `call:${JSON.stringify((action as {functionCall?:unknown})?.functionCall)}`;
};

function checkScreenRules(surface:Surface,root:A2uiComponent,catalog:A2uiCatalog,add:Add){
 const all=[...surface.components.values()];
 const tabs=all.find(component=>component.component==='WorkTabs');
 if(tabs){
  if(tabs.selected!==root.task)add(tabs.id,'selected-task',`작업 탭은 이 화면(${String(root.task)})을 골라 두어야 해요`);
  if(Array.isArray(tabs.tabs)&&!tabs.tabs.includes(root.task))add(tabs.id,'selected-task','작업 탭에 이 화면이 없어요');
 }
 // Rule 3: every focus screen shows the current cut's text — in CurrentCut, or as the current CutItem of a list.
 const lists=all.filter(component=>component.component==='CutList');
 if(root.current===undefined&&!lists.length)add('root','current-cut','현재 컷의 글이 보여야 해요: current나 CutList가 필요해요');
 if(root.current!==undefined&&lists.length)add('root','current-cut','현재 컷은 한 곳에만 둬요: current와 CutList를 함께 쓰지 않아요');
 // Rule 4: a neighbour card with a scene preview is tablet/desktop context only.
 for(const card of all.filter(component=>component.component==='CutCard'&&(component.kind??'cut')==='cut'))if(effectiveDevices(surface,card.id).some(device=>device==='phone'||device==='phoneLandscape'))add(card.id,'cut-card-devices','장면 미리보기가 있는 이전·다음 컷 카드는 태블릿 이상에서만 둬요');
 const primaries=all.filter(component=>component.component==='Button'&&component.variant==='primary');
 if(primaries.length>1)primaries.slice(1).forEach(button=>add(button.id,'one-primary','색을 채운 주 단추는 한 화면에 하나예요'));
 // One way per job: the same action twice on a screen, on any shared device, is a duplicate.
 const seen=new Map<string,{id:string;devices:Device[]}[]>();
 for(const component of all){
  const schema=catalog.components[component.component];
  for(const [prop,propSchema] of Object.entries(schema?.properties??{})){
   if(refName(propSchema)!=='Action'||component[prop]===undefined)continue;
   const key=actionKey(component[prop]);
   const devices=effectiveDevices(surface,component.id);
   for(const other of seen.get(key)??[])if(other.devices.some(device=>devices.includes(device)))add(component.id,'one-way',`${other.id}와 같은 일을 해요(${key})`);
   seen.set(key,[...seen.get(key)??[],{id:component.id,devices}]);
  }
 }
}

/**
 * Accessible names of the controls a blueprint shows on a device under `fromId`, with every More closed
 * (its summary counts, its contents do not). Used to compare a blueprint with the real screen.
 */
export function controlNames(surface:Surface,device:Device,fromId='root'):string[]{
 const names:string[]=[];
 const read=(raw:unknown)=>{const resolved=raw&&typeof raw==='object'&&'path' in raw?readPointer(surface.data,String((raw as {path:unknown}).path)):raw;return resolved===undefined||resolved===null?'':String(resolved);};
 const visit=(id:string)=>{
  const c=surface.components.get(id);
  if(!c||!effectiveDevices(surface,id).includes(device))return;
  switch(c.component){
   case 'Button':case 'Slider':case 'TextArea':names.push(read(c.label));break;
   case 'Choice':case 'TextField':names.push(read(c.name??c.label));break;
   case 'CutCard':names.push(c.side==='previous'?'이전 컷':'다음 컷');break;
   case 'Stage':if(c.phoneStrip===true&&device==='phone')names.push('무대 펼치기');break;
   case 'CurrentCut':
    for(const child of childIds(c))visit(child);
    names.push('이 컷부터 재생');
    if(c.editable===true)names.push(`${read(c.cut)}컷 글`);
    return;
   case 'IconButton':names.push(read(c.name));break;
   case 'Toggle':names.push(read(c.name??c.label));break;
   case 'AssetPicker':names.push(`${read(c.label)} 이미지 찾기 · ${read(c.value)}`);break;
   case 'More':names.push(read(c.summary));return;
   case 'CutList':
    for(const child of childIds(c))if(device!=='phone'||c.phoneShows==='all'||read(surface.components.get(child)?.current)==='true')visit(child);
    return;
   case 'CutItem':
    if(device!=='phone'||[...surface.components.values()].some(list=>list.component==='CutList'&&list.phoneShows==='all'&&childIds(list).includes(c.id)))names.push(`${read(c.cut)}컷 · ${read(c.speaker)} · 이 컷 선택`);
    names.push('이 컷부터 재생');
    break;
  }
  for(const child of childIds(c))visit(child);
 };
 visit(fromId);
 return names;
}
