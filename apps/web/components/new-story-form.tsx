"use client";
import { useState } from "react";
import styles from "./story-workspace.module.css";

export function NewStoryForm({ disabled, onCreate }: {
  disabled: boolean;
  onCreate: (title: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  return <div className={styles.newStory}>
    <button disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>새 작품 만들기</button>
    {open && <form className={styles.newStoryForm} onSubmit={event => {
      event.preventDefault();
      if (title.trim() && onCreate(title.trim())) {
        setTitle("");
        setOpen(false);
      }
    }}>
      <label>새 작품 제목<input autoFocus aria-label="새 작품 제목" maxLength={200} required value={title} onChange={event => setTitle(event.target.value)} /></label>
      <p>기존 작품을 보관하고, 글과 자산이 없는 첫 컷부터 시작해요.</p>
      <button type="submit" disabled={!title.trim()}>빈 작품 시작</button>
      <button type="button" onClick={() => setOpen(false)}>취소</button>
    </form>}
  </div>;
}
