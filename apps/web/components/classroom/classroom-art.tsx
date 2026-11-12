import type {AssignmentFormat} from '../../lib/classroom-api';
import styles from './classroom.module.css';
/** Shared book mark: a quiet link to the library, never a replacement for a label. */
export function ClassroomBook({format='knolstory',small=false}:{format?:AssignmentFormat;small?:boolean}){
 return <span className={`${styles.bookMark} ${format==='shortstory'?styles.pictureBook:''} ${small?styles.smallBook:''}`} aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M9 9.5c6-1.5 10-.5 15 3 5-3.5 9-4.5 15-3v27c-6-1.5-10-.5-15 3-5-3.5-9-4.5-15-3v-27Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M24 13v26M14 17c2-.2 4 .4 6 1.5M14 23c2-.2 4 .4 6 1.5M29 29l3-4 3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M29 16h5v6l-2.5-1.5L29 22v-6Z" fill="currentColor"/></svg></span>;
}
/** Mission mark: a round seal with a check. Decorative; the status text beside it carries the meaning. */
export function MissionSeal({small=false,earned=false}:{small?:boolean;earned?:boolean}){
 return <span className={`${styles.missionSeal} ${small?styles.smallSeal:''} ${earned?styles.earnedSeal:''}`} aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2"/><circle cx="24" cy="24" r="12.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.2 2.6"/><path d="m17.5 24.5 4.4 4.3 8.8-9.3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}
