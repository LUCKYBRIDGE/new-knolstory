"use client";
import { useRef, useState } from "react";
import styles from "./story-workspace.module.css";
import { TitleInput } from "./title-input";
import { titleBody } from "../lib/student-title";

export function NewStoryForm({ disabled, onCreate, onCancel }: {
  disabled: boolean;
  onCancel: () => void;
  onCreate: (title: string) => boolean;
}) {
  const [title, setTitle] = useState("");
  const composing = useRef(false);
  return <div className={styles.newStory}>
    <form className={styles.newStoryForm} onSubmit={event => {
      event.preventDefault();
      if (!composing.current && !disabled && titleBody(title).trim() && onCreate(title.trim())) {
        setTitle("");
      }
    }}>
      <label>새 작품 제목<TitleInput onBlur={() => {composing.current=false;}} onCompositionStart={() => {composing.current=true;}} onCompositionEnd={() => {composing.current=false;}} onKeyDown={event => {if(event.key==='Enter'&&(composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229))event.preventDefault();}} aria-label="새 작품 제목" maxLength={200} required value={title} onChange={setTitle} /></label>
      <p>첫 컷의 대사나 해설부터 바로 써요. 표지와 기획은 나중에 설정에서 정해도 돼요.</p>
      <button type="submit" disabled={disabled || !titleBody(title).trim()}>새 작품 생성</button>
      <button type="button" onClick={() => {composing.current=false;onCancel();}}>취소</button>
    </form>
  </div>;
}
