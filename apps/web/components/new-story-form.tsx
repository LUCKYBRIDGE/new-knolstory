"use client";
import { useRef, useState } from "react";
import styles from "./story-workspace.module.css";

export function NewStoryForm({ disabled, onCreate }: {
  disabled: boolean;
  onCreate: (title: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const composing = useRef(false);
  return <div className={styles.newStory}>
    <button disabled={disabled} aria-expanded={open} onClick={() => {composing.current=false;setOpen(!open);}}>새 작품 만들기</button>
    {open && <form className={styles.newStoryForm} onSubmit={event => {
      event.preventDefault();
      if (!composing.current && !disabled && title.trim() && onCreate(title.trim())) {
        setTitle("");
        setOpen(false);
      }
    }}>
      <label>새 작품 제목<input autoFocus onBlur={() => {composing.current=false;}} onCompositionStart={() => {composing.current=true;}} onCompositionEnd={() => {composing.current=false;}} onKeyDown={event => {if(event.key==='Enter'&&(composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229))event.preventDefault();}} aria-label="새 작품 제목" maxLength={200} required value={title} onChange={event => setTitle(event.target.value)} /></label>
      <p>첫 컷의 대사·해설을 바로 쓰기 시작합니다. 표지와 기획은 나중에 설정에서 정할 수 있어요.</p>
      <button type="submit" disabled={!title.trim()}>새 작품 생성</button>
      <button type="button" onClick={() => {composing.current=false;setOpen(false);}}>취소</button>
    </form>}
  </div>;
}
