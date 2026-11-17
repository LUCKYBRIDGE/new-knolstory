'use client';
import {useEffect,useState,type InputHTMLAttributes} from 'react';
import {currentStudentNumber,STUDENT_NUMBER_EVENT} from '../lib/student-file-prefix';
import {studentPrefix,titleBody} from '../lib/student-title';
import styles from './title-input.module.css';

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'>&{value:string;onChange:(title:string)=>void};
/** A work title field. On a student's device the class number ("07_") is shown in front and kept;
 * only the rest can be typed. Everyone else gets a plain input. */
export function TitleInput({value,onChange,...input}:Props){
 // Read after mount: the number lives in this device's storage, which the static export cannot see.
 const [number,setNumber]=useState<number|null>(null);
 useEffect(()=>{
  const read=()=>setNumber(currentStudentNumber());
  const timer=window.setTimeout(read,0);window.addEventListener(STUDENT_NUMBER_EVENT,read);
  return()=>{window.clearTimeout(timer);window.removeEventListener(STUDENT_NUMBER_EVENT,read);};
 },[]);
 if(number===null)return <input {...input} value={value} onChange={event=>onChange(event.target.value)}/>;
 const prefix=studentPrefix(number);
 return <span className={styles.locked}><span className={styles.prefix} title="내 번호예요. 바꿀 수 없어요.">{prefix}</span>
  <input {...input} value={titleBody(value,number)} onChange={event=>onChange(prefix+titleBody(event.target.value,number))}/></span>;
}
