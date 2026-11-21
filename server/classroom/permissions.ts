/** Editing permissions contract (docs/architecture/classroom-design.md section 4). */
export type EditingPermissions={
 text:true;images:boolean;characters:boolean;audio:boolean;direction:boolean;choices:boolean;newWorks:boolean;forcedStoryKey:string|null;
};
export const ALLOW_ALL_PERMISSIONS:EditingPermissions=Object.freeze({text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null}) as EditingPermissions;
const FLAGS=['images','characters','audio','direction','choices','newWorks'] as const;
const KEYS=new Set<string>(['text',...FLAGS,'forcedStoryKey']);
export class PermissionsError extends Error{constructor(){super('INVALID_REQUEST');this.name='PermissionsError';}}
/**
 * Validates untrusted input. Unknown keys and non-boolean flags are rejected.
 * Omitted flags default to allowed, omitted forcedStoryKey to null, and text is always true.
 */
export function normalizePermissions(value:unknown):EditingPermissions{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new PermissionsError();
 const input=value as Record<string,unknown>;
 if(Object.keys(input).some(key=>!KEYS.has(key)))throw new PermissionsError();
 const result:Record<string,unknown>={text:true};
 for(const flag of FLAGS){
  const flagValue=input[flag];
  if(flagValue!==undefined&&typeof flagValue!=='boolean')throw new PermissionsError();
  result[flag]=flagValue??true;
 }
 if(input.text!==undefined&&typeof input.text!=='boolean')throw new PermissionsError();
 const key=input.forcedStoryKey;
 if(key!==undefined&&key!==null&&(typeof key!=='string'||key.length<1||key.length>128||/[\u0000-\u001f\u007f]/.test(key)))throw new PermissionsError();
 result.forcedStoryKey=key??null;
 return result as EditingPermissions;
}
/** Per-student override > classroom default > allow all. Stored values are re-normalised defensively. */
export function effectivePermissions(student:unknown,classroomDefault:unknown):EditingPermissions{
 for(const candidate of [student,classroomDefault]){
  if(candidate===null||candidate===undefined)continue;
  try{return normalizePermissions(candidate);}catch{/* fall through to the next layer */}
 }
 return {...ALLOW_ALL_PERMISSIONS};
}
/** Editing tools one writing task allows (text is always allowed). null follows the class/student setting. */
export type EditScope={images:boolean;characters:boolean;audio:boolean;direction:boolean;choices:boolean};
const SCOPE_FLAGS=['images','characters','audio','direction','choices'] as const;
/** Strict: every flag must be a boolean and no other key is accepted. */
export function normalizeEditScope(value:unknown):EditScope|null{
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new PermissionsError();
 const input=value as Record<string,unknown>,keys=Object.keys(input);
 if(keys.length!==SCOPE_FLAGS.length||keys.some(key=>!(SCOPE_FLAGS as readonly string[]).includes(key)))throw new PermissionsError();
 const result={} as EditScope;
 for(const flag of SCOPE_FLAGS){if(typeof input[flag]!=='boolean')throw new PermissionsError();result[flag]=input[flag] as boolean;}
 return result;
}
/** A stored scope that no longer parses is treated as "follow the class setting", never as more access. */
export function storedEditScope(value:unknown):EditScope|null{
 if(value===null||value===undefined)return null;
 try{return normalizeEditScope(value);}catch{return {images:false,characters:false,audio:false,direction:false,choices:false};}
}
