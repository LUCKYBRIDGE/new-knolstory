'use client';
import {useId,useState} from 'react';
import {promptAppInstall,useAppInstall} from '../lib/app-install';

/**
 * ‘홈 화면에 추가’ beside the fullscreen controls. Hidden where the app is already installed or the
 * browser cannot add it; on iPhone and iPad it explains the Share sheet step instead.
 */
export function AppInstallButton({className,noteClassName,glyph}:{className?:string;noteClassName?:string;glyph?:boolean}){
 const way=useAppInstall(),[note,setNote]=useState(false),noteId=useId();
 if(!way)return null;
 if(way==='prompt')return <button type="button" className={className} data-app-install onClick={()=>void promptAppInstall()}>홈 화면에 추가{glyph&&<span aria-hidden="true">＋</span>}</button>;
 return <>
  <button type="button" className={className} data-app-install aria-expanded={note} aria-controls={noteId} onClick={()=>setNote(value=>!value)}>홈 화면에 추가{glyph&&<span aria-hidden="true">＋</span>}</button>
  {note&&<p id={noteId} className={noteClassName} data-app-install-note>공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 고르세요. 홈 화면에서 열면 주소창 없이 넓게 보여요.</p>}
 </>;
}
