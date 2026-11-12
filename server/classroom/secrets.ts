import {createCipheriv,createDecipheriv,createHash,randomBytes,randomInt,scrypt,timingSafeEqual} from 'node:crypto';
/** Pure classroom secret handling. No database or HTTP access. */
export const CLASS_CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CLASS_CODE_PATTERN=/^[A-HJ-NP-Z2-9]{6}$/;
const SCRYPT={N:16384,r:8,p:1,maxmem:64*1024*1024},KEY_LENGTH=32,TOKEN_PATTERN=/^(?:[A-Za-z0-9_-]{27}|[A-Za-z0-9_-]{43})$/;
function derive(secret:string,salt:Buffer):Promise<Buffer>{
 return new Promise((resolve,reject)=>scrypt(secret.normalize('NFKC'),salt,KEY_LENGTH,SCRYPT,(error,key)=>error?reject(error):resolve(key)));
}
/** Stored form: scrypt$<salt>$<hash>, base64url, fixed parameters. */
export async function hashSecret(secret:string):Promise<string>{
 const salt=randomBytes(16);
 return `scrypt$${salt.toString('base64url')}$${(await derive(secret,salt)).toString('base64url')}`;
}
export async function verifySecret(secret:string,stored:string):Promise<boolean>{
 const parts=typeof stored==='string'?stored.split('$'):[];
 if(typeof secret!=='string'||parts.length!==3||parts[0]!=='scrypt')return false;
 const salt=Buffer.from(parts[1]!,'base64url'),expected=Buffer.from(parts[2]!,'base64url');
 if(salt.length!==16||expected.length!==KEY_LENGTH)return false;
 return timingSafeEqual(await derive(secret,salt),expected);
}
/** A constant hash to verify against when an account does not exist, so lookup misses cost the same. */
let decoy:Promise<string>|undefined;
export function decoyHash():Promise<string>{return decoy??=hashSecret('knolstory-decoy');}
export function generateClassCode(pick:(max:number)=>number=max=>randomInt(max)):string{
 let code='';
 for(let index=0;index<6;index++)code+=CLASS_CODE_ALPHABET[pick(CLASS_CODE_ALPHABET.length)]!;
 return code;
}
export function normalizeClassCode(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const code=value.trim().toUpperCase();return CLASS_CODE_PATTERN.test(code)?code:null;
}
export function generateStudentPassword(pick:(max:number)=>number=max=>randomInt(max)):string{
 return String(pick(10000)).padStart(4,'0');
}
export function generateQrToken():{token:string;hash:string}{
 // 160 bits of CSPRNG entropy keeps printed QR data compact. Old 256-bit tokens remain accepted.
 const token=randomBytes(20).toString('base64url');return {token,hash:hashQrToken(token)};
}
export function validQrToken(value:unknown):value is string{return typeof value==='string'&&TOKEN_PATTERN.test(value);}
export function hashQrToken(token:string):string{return createHash('sha256').update(token).digest('hex');}
/** KNOL_CLASSROOM_SECRET: base64 text that decodes to exactly 32 bytes. */
export function parseClassroomSecret(value:string):Buffer{
 const text=value.trim();
 if(!/^[A-Za-z0-9+/_-]+={0,2}$/.test(text))throw Error('Invalid classroom secret.');
 const key=Buffer.from(text,'base64');
 if(key.length!==32)throw Error('Invalid classroom secret.');
 return key;
}
/** AES-256-GCM. Output v1.<iv>.<tag>.<ciphertext>; the context (account id) is authenticated, so rows cannot be swapped. */
export function encryptText(key:Buffer,plain:string,context:string):string{
 if(key.length!==32)throw Error('Invalid classroom secret.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from(context));
 const body=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),body.toString('base64url')].join('.');
}
export function decryptText(key:Buffer,stored:string,context:string):string{
 const parts=stored.split('.');
 if(key.length!==32||parts.length!==4||parts[0]!=='v1')throw Error('Invalid ciphertext.');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(parts[1]!,'base64url'));
 decipher.setAAD(Buffer.from(context));decipher.setAuthTag(Buffer.from(parts[2]!,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(parts[3]!,'base64url')),decipher.final()]).toString('utf8');
}
