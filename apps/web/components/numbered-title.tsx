import {splitNumberedTitle} from '../lib/numbered-title';
import styles from './numbered-title.module.css';
/** A work title with a student's class number shown as a badge instead of a "07_" prefix. */
export function NumberedTitle({title}:{title:string}){
 const {number,rest}=splitNumberedTitle(title);
 if(number===null)return <>{title}</>;
 return <><span className={styles.badge} aria-label={`${Number(number)}번`}>{number}</span> {rest}</>;
}
