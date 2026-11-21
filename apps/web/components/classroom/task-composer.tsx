'use client';
import {PhoneFold} from './phone-fold';
import styles from './classroom.module.css';
export type TaskRequest=Readonly<{kind:'knolstory'|'shortstory'|'provided'|'reading'|'worksheet'|'custom';nonce:number}>;
const CHOICES:readonly {kind:TaskRequest['kind'];title:string;hint:string}[]=[
 {kind:'provided',title:'제공 과제 가져오기',hint:'기본 작품 읽기·활동지를 골라 고쳐 내요'},
 {kind:'knolstory',title:'작품 쓰기 · 놀스토리',hint:'장면과 대사로 이야기를 써서 내요'},
 {kind:'shortstory',title:'작품 쓰기 · 숏스토리',hint:'그림과 글로 짧은 그림책을 만들어 내요'},
 {kind:'worksheet',title:'독후 활동지',hint:'질문에 답을 쓰면 선생님이 확인해요'},
 {kind:'reading',title:'읽기',hint:'작품을 읽고 읽었다고 알려요'},
 {kind:'custom',title:'교실 활동',hint:'종이·발표처럼 온라인 답 없이 확인해요'},
];
/** One place to start any task; the matching form opens below. */
export function TaskComposer({onPick}:{onPick:(kind:TaskRequest['kind'])=>void}){
 // Phones fold the six choices into one line so the class's tasks stay near the top; a pick folds it again.
 return <section className={`${styles.card} ${styles.composer}`} aria-label="새 과제 내기">
  <PhoneFold eyebrow="무엇을 낼까요?" title="새 과제 내기">
   <p className={styles.hint}>종류를 고르면 그 과제를 만드는 칸이 열려요. 마감일은 선택이에요. 학생은 모든 과제를 ‘할 일’ 한 목록에서 봐요.</p>
   <ul className={styles.composerChoices}>{CHOICES.map(choice=><li key={choice.kind}><button type="button" className={styles.composerChoice} data-kind={choice.kind} data-fold-after onClick={()=>onPick(choice.kind)}><strong>{choice.title}</strong><small>{choice.hint}</small></button></li>)}</ul>
  </PhoneFold>
 </section>;
}
