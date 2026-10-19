import {createHash} from 'node:crypto';
import {assertCatalogOnlyMedia} from '../../packages/asset-registry/src/catalog-media-policy';
import {prepareJsonbSnapshot,restoreJsonbSnapshot,type AuthoringJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
export class DocumentServiceError extends Error {
 constructor(readonly code:string,readonly status:number,readonly actualRevision?:number){super(code);this.name='DocumentServiceError';}
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function identifier(value:unknown):string {if(typeof value!=='string'||!uuid.test(value))throw new DocumentServiceError('INVALID_REQUEST',400);return value;}
export function requestObject(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(key=>!keys.includes(key)))throw new DocumentServiceError('INVALID_REQUEST',400);
 return structuredClone(value) as Record<string,unknown>;
}
export function idempotency(value:unknown):string{
 if(typeof value!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(value))throw new DocumentServiceError('INVALID_REQUEST',400);return value;
}
export function positive(value:unknown):number{
 const result=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;
 if(typeof result!=='number'||!Number.isSafeInteger(result)||result<1)throw new DocumentServiceError('STORAGE_CONTRACT_VIOLATION',503);return result;
}
export function timestamp(value:unknown):number{
 const result=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;
 if(typeof result!=='number'||!Number.isSafeInteger(result)||result<0)throw new DocumentServiceError('STORAGE_CONTRACT_VIOLATION',503);return result;
}
export function clockTime(clock:()=>number):number {return timestamp(clock());}
export async function checkedSnapshot(value:unknown):Promise<AuthoringJsonbSnapshot>{
 let snapshot:AuthoringJsonbSnapshot;
 try{snapshot=await prepareJsonbSnapshot(await restoreJsonbSnapshot(value));}catch{throw new DocumentServiceError('INVALID_SNAPSHOT',400);}
 try{assertCatalogOnlyMedia(snapshot.content);}catch{throw new DocumentServiceError('CATALOG_MEDIA_REQUIRED',422);}
 return snapshot;
}
function canonical(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value!==null&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`;
 return JSON.stringify(value);
}
export function requestHash(value:unknown):string{return createHash('sha256').update(canonical(value)).digest('hex');}
export type DocumentCursor=Readonly<{updatedAt:number;recordId:string}>;
export function listInput(value:unknown):{limit:number;cursor:DocumentCursor|null}{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['limit','cursor'].includes(key)))throw new DocumentServiceError('INVALID_REQUEST',400);
 const input=structuredClone(value) as {limit?:unknown;cursor?:unknown},limit=input.limit??20;
 if(typeof limit!=='number'||!Number.isSafeInteger(limit)||limit<1||limit>50)throw new DocumentServiceError('INVALID_REQUEST',400);
 if(input.cursor===undefined)return {limit,cursor:null};
 try{
  if(typeof input.cursor!=='string'||! /^[A-Za-z0-9_-]{1,256}$/.test(input.cursor))throw Error();
  const parsed=requestObject(JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8')),['updatedAt','recordId']);
  if(typeof parsed.updatedAt!=='number')throw Error();
  const cursor={updatedAt:timestamp(parsed.updatedAt),recordId:identifier(parsed.recordId)};
  if(Buffer.from(JSON.stringify(cursor)).toString('base64url')!==input.cursor)throw Error();
  return {limit,cursor};
 }catch{throw new DocumentServiceError('INVALID_REQUEST',400);}
}
