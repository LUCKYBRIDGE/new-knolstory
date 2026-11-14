'use client';
import {useRef,useState} from 'react';
import {useOnlineWorks,type OnlineWorksProps} from './use-online-works';
import {useBoundedAccountPanel} from './use-bounded-account-panel';
import styles from './online-works-panel.module.css';
export function OnlineWorksPanel(props:OnlineWorksProps){
 const online=useOnlineWorks(props);
 return <OnlineWorksPanelView {...props} online={online}/>;
}
export function OnlineWorksPanelView({online,acceptedFormat='knolstory',works,disabled=false}:OnlineWorksProps&{online:ReturnType<typeof useOnlineWorks>}){
 const {account,documents,cursor,range,confirmTrash,setConfirmTrash,busy,error,notice,listVisible,list,refresh,open,changeState}=online;
 const [selected,setSelected]=useState(''),menu=useRef<HTMLDetailsElement>(null);
 useBoundedAccountPanel(menu);
 return <details ref={menu} className={styles.menu} data-online-works><summary>온라인 작품</summary><section aria-label="온라인 작품" className={styles.panel}>
  <strong>내 온라인 작품</strong><p>작품은 먼저 기기에 작품 파일로 저장해 두세요. 업로드는 온라인에 올리는 것이고, 작품 파일 저장을 대신하지 않아요.</p>
  {account.loading?<p role="status">로그인 확인 중이에요.</p>:!account.session?<p>{account.error||'계정 메뉴에서 로그인한 뒤 이용할 수 있어요.'}</p>:<>
   <div role="group" aria-label="온라인 작품 범위"><button disabled={disabled||busy} aria-pressed={range==='active'} onClick={()=>void list(false,'active')}>업로드한 작품</button><button disabled={disabled||busy} aria-pressed={range==='trash'} onClick={()=>void list(false,'trash')}>온라인 휴지통</button></div>
   <button disabled={disabled||busy} onClick={refresh}>목록 새로고침</button>
   <label>온라인에 업로드할 기기 작품<select aria-label="온라인에 업로드할 기기 작품" value={selected} disabled={disabled||busy} onChange={event=>setSelected(event.target.value)}><option value="">작품 선택</option>{works.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</select></label>
   <button disabled={disabled||busy||!works.some(work=>work.key===selected)} onClick={()=>void online.save(selected)}>선택한 작품 업로드</button>
   <p>처음 올리면 새 온라인 작품이 생겨요. 이미 올린 작품을 다시 올리면 연결된 온라인 작품이 새 내용으로 바뀌어요. 온라인 작품을 열면 서재에 사본이 따로 생기고 기존 원고는 그대로예요. 다른 곳에서 고친 내용과 겹치면 온라인 사본을 열어 비교하거나, 서재에서 사본을 만들어 새 온라인 작품으로 올려 주세요.</p>
   {range==='trash'&&<p>온라인 휴지통에서 복구하면 같은 작품과 업로드 이력을 이어가요. 기기의 원고는 바뀌지 않아요.</p>}
   <ul>{(listVisible?documents:[]).map(record=><li key={record.recordId}><span>{record.title}</span>{range==='trash'?<button disabled={disabled||busy||record.stateVersion===undefined} aria-label={`${record.title} · 온라인 작품 복구`} onClick={()=>void changeState(record,'restore')}>온라인 작품 복구</button>:<>{record.format===acceptedFormat?<button disabled={disabled||busy} aria-label={`${record.title} · 기기에 사본으로 열기`} onClick={()=>void open(record)}>기기에 사본으로 열기</button>:<small>{record.format==='shortstory'?'숏스토리 그림책 화면에서 열 수 있어요.':'놀스토리 서재에서 열 수 있어요.'}</small>}<button disabled={disabled||busy||record.stateVersion===undefined} aria-label={`${record.title} · 온라인 휴지통으로 이동`} onClick={()=>setConfirmTrash(record)}>온라인 휴지통으로 이동</button></>}</li>)}</ul>
   {listVisible&&confirmTrash&&<div role="group" aria-label="온라인 휴지통 이동 확인"><p>‘{confirmTrash.title}’을 온라인 휴지통으로 옮길까요? 기기에 있는 원고는 유지되고, 온라인 휴지통에서 같은 작품으로 복구할 수 있어요.</p><button disabled={disabled||busy} onClick={()=>setConfirmTrash(null)}>취소</button><button disabled={disabled||busy} onClick={()=>void changeState(confirmTrash,'trash')}>온라인 휴지통으로 옮기기</button></div>}
   {listVisible&&cursor&&<button disabled={disabled||busy} onClick={()=>void list(true)}>목록 더 보기</button>}
   {busy&&!notice&&<p role="status">온라인 작업 중이에요.</p>}
  </>}
  {!account.loading&&<button disabled={disabled||busy} onClick={()=>void account.refresh()}>로그인 상태 다시 확인</button>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section></details>;
}
