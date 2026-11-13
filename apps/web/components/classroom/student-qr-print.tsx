'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ClassroomError,prepareStudentQrPrint,type StudentQrPrint} from '../../lib/classroom-api';
import {trapDialogTab} from '../../lib/dialog-keyboard';
import {qrPrintPages,qrPrintLayout,qrPrintDensity} from '../../lib/qr-print-layout';
import {QrCode} from './qr-code';
import styles from './student-qr-print.module.css';

type Props={numbers:readonly number[];csrf:string;onClose:()=>void};
/** QR tokens live only in this open workspace and are never persisted to browser storage. */
export function StudentQrPrintWorkspace({numbers,csrf,onClose}:Props){
 const [columns,setColumns]=useState(3),[rows,setRows]=useState(4),[prepared,setPrepared]=useState<StudentQrPrint|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[legacy,setLegacy]=useState(false),[replace,setReplace]=useState(false);
 const close=useRef(onClose);
 useLayoutEffect(()=>{close.current=onClose;},[onClose]);
 const workspace=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),lock=useRef(false),heading=useRef<HTMLHeadingElement>(null),printAction=useRef<HTMLButtonElement>(null),confirmInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const opener=document.activeElement;
  const siblings=[...document.body.children].filter((node):node is HTMLElement=>node instanceof HTMLElement&&!node.hasAttribute('data-qr-print-root')).map(node=>({node,inert:node.inert}));
  siblings.forEach(({node})=>{node.inert=true;});
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}};window.addEventListener('keydown',escape);
  heading.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{window.removeEventListener('keydown',escape);request.current?.abort();siblings.forEach(({node,inert})=>{node.inert=inert;});document.body.style.overflow=previous;if(opener instanceof HTMLElement&&opener.isConnected)opener.focus();};
 },[]);
 const preview=useRef<HTMLDivElement>(null),[previewScale,setPreviewScale]=useState(1);
 // Screen-only fit: a 190mm A4 sheet is shown whole on a phone; printing always uses true size.
 useEffect(()=>{const node=preview.current;if(!node)return;const fit=()=>{const width=node.clientWidth-16;setPreviewScale(width>0?Math.min(1,width/718):1);};const observer=new ResizeObserver(fit);observer.observe(node);fit();return()=>observer.disconnect();});
 useEffect(()=>{if(prepared){if(printAction.current?.disabled)heading.current?.focus();else printAction.current?.focus();}else if(legacy)confirmInput.current?.focus();},[prepared,legacy]);
 async function prepare(){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  const controller=new AbortController();request.current=controller;
  try{
   const result=await prepareStudentQrPrint(numbers,csrf,legacy&&replace,(input,init)=>fetch(input,{...init,signal:controller.signal}));
   if(!controller.signal.aborted){setPrepared(result);setLegacy(false);setReplace(false);}
  }catch(issue){if(!controller.signal.aborted){if(issue instanceof ClassroomError&&issue.code==='QR_REISSUE_REQUIRED')setLegacy(true);setError(issue instanceof Error?issue.message:'QR을 준비하지 못했어요.');}}
  finally{lock.current=false;if(!controller.signal.aborted)setBusy(false);}
 }
 const layout=qrPrintLayout(columns,rows),pages=qrPrintPages(prepared?.cards??[],columns,rows),count=Math.ceil(numbers.length/layout.perPage);
 const maxModules=useMemo(()=>qrPrintDensity(prepared?.cards.map(card=>card.url)??[],1).maxModules,[prepared]);
 const density={printable:layout.qrMm/(maxModules+8)>=.5};
 return createPortal(<dialog open ref={workspace} aria-modal="true" className={styles.workspace} data-qr-print-root data-qr-printable={!!prepared&&density.printable} aria-label="학생 로그인 QR 인쇄" onKeyDown={event=>trapDialogTab(event.nativeEvent,workspace.current)}>
  <style media="print">{'@page { size: A4 portrait; margin: 10mm; } body:has([data-qr-print-root]) { margin:0!important; padding:0!important; overflow:visible!important; } body:has([data-qr-print-root]) > :not([data-qr-print-root]) { display:none!important; }'}</style>
  <header className={styles.toolbar}><div><span className={styles.eyebrow}>놀스토리 · 학생 접속 카드</span><h1 ref={heading} tabIndex={-1}>학생 로그인 QR 인쇄</h1><p>학생 {numbers.length}명 · 한 쪽에 {layout.perPage}명 · 총 {count}쪽</p></div><button onClick={onClose}>학생 목록으로</button></header>
  <div className={styles.controls}>
   <label>가로 열<select aria-label="가로 열 수" value={columns} disabled={busy} onChange={event=>setColumns(Number(event.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}열</option>)}</select></label>
   <label>세로 행<select aria-label="세로 행 수" value={rows} disabled={busy} onChange={event=>setRows(Number(event.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}행</option>)}</select></label>
   {!prepared?<button className={styles.primary} disabled={busy||legacy&&!replace} onClick={()=>void prepare()}>{busy?'QR 준비 중…':legacy?'이전 QR 바꾸고 준비':'QR 준비'}</button>:<button ref={printAction} className={styles.primary} disabled={!density.printable} onClick={()=>{if(density.printable)window.print();}}>인쇄하기</button>}
   <p>용지: A4 세로 · 배율: 100%<br/>인쇄 창에서 PDF로 저장할 수도 있어요.</p>
  </div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {legacy&&<label className={styles.confirm}><input ref={confirmInput} type="checkbox" checked={replace} onChange={event=>setReplace(event.target.checked)}/>이전에 배부한 QR이 바뀌는 것을 확인했어요. 해당 학생에게 새 카드를 나눠 줄게요.</label>}
  {prepared&&!density.printable&&<div className={styles.error} role="alert">QR이 너무 작고 촘촘해요. 칸 수를 줄여 크게 인쇄해 주세요. <button onClick={()=>{setColumns(2);setRows(3);}}>2열 × 3행으로 크게</button></div>}
  {prepared?<>
   <p className={styles.note} role="status">QR을 준비했어요. 배치를 바꾸거나 다시 인쇄해도 이 QR은 그대로예요. 학생 본인에게만 나눠 주세요.</p>
   <div ref={preview} className={styles.preview} aria-label="A4 인쇄 미리보기" style={{'--qr-preview-scale':previewScale} as CSSProperties}>{pages.map((cards,index)=><article className={styles.sheet} data-qr-print-page data-qr-grid={`${columns}x${rows}`} key={index} style={{'--qr-columns':columns,'--qr-rows':rows,'--qr-size':`${layout.qrMm}mm`,'--qr-name-font':`${layout.fontPt}pt`,'--qr-name-height':layout.lineHeight,'--qr-card-gap':`${layout.gapMm}mm`,'--qr-card-padding':`${layout.paddingMm}mm`,'--qr-code-font':`${layout.codeFontPt}pt`,'--qr-code-height':layout.codeLineHeight} as CSSProperties}>
    <header className={styles.pageHeader}><strong>{prepared.className}</strong><span>놀스토리 · 학생 로그인 카드</span></header>
    <div className={styles.cardGrid}>{cards.map(card=><section className={styles.card} key={card.number} data-qr-student={card.number}>
     <span className={styles.classCode}>학급 코드 {prepared.classCode}</span><h2>{card.number}번{card.name&&<> · {card.name}</>}</h2>
     <QrCode value={card.url} label={`${card.number}번 ${card.name} 학생 로그인 QR`}/>{layout.showHint&&<p>카메라로 비추면 바로 들어가요.</p>}
    </section>)}</div>
    <footer className={styles.pageFooter}><span>학생 본인에게만 나눠 주세요.</span><span>{index+1} / {pages.length}쪽</span></footer>
   </article>)}</div>
  </>:<div className={styles.empty}><strong>한 번 준비하면 다시 인쇄할 수 있어요.</strong><p>선택한 {numbers.length}명의 로그인 QR을 준비한 뒤 인쇄 미리보기를 보여 드려요.</p><p>기존에 인쇄용으로 준비한 QR은 다시 만들지 않고 그대로 사용해요.</p></div>}
 </dialog>,document.body);
}
