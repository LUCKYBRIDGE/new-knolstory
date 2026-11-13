/**
 * Student accounts always save files as "07_제목.knolstory": the class number (01–30) comes first,
 * so a teacher collecting files in a shared folder can sort them at once.
 * The number is kept on this device after a student signs in, so offline saves keep the prefix.
 */
const KEY='knolstory-student-number-v1';
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const store=():Store|undefined=>{try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}};
export function rememberStudentNumber(number:number|null,storage:Store|undefined=store()){
 try{if(number!==null&&Number.isInteger(number)&&number>=1&&number<=30)storage?.setItem(KEY,String(number));else storage?.removeItem(KEY);}catch{/* Optional: saving still works without the prefix. */}
}
export function currentStudentNumber(storage:Store|undefined=store()):number|null{
 try{const value=Number(storage?.getItem(KEY));return Number.isInteger(value)&&value>=1&&value<=30?value:null;}catch{return null;}
}
export const studentNumberLabel=(number:number)=>String(number).padStart(2,'0');
/** Puts the two-digit number first; an existing "NN_" prefix is replaced, never doubled. */
export function withStudentNumber(name:string,number:number|null=currentStudentNumber()):string{
 if(number===null)return name;
 return `${studentNumberLabel(number)}_${name.replace(/^\s*\d{1,2}_/,'')}`;
}
