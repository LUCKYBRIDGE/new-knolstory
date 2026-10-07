"use client";
import {BookCover} from "./book-cover";
import {type StoryProject} from "@knolstory/story-domain";
import { NewStoryForm } from "./new-story-form";
import styles from "./local-bookshelf.module.css";

export type BookshelfWork = {
  key: string;
  project: StoryProject;
  kind: "own" | "imported" | "example" | "original";
  canResume: boolean;
};
export type BookshelfIntent = "edit" | "start" | "resume" | "prepare";
export type LocalBookshelfProps = {
  works: readonly BookshelfWork[];
  onOpen: (key: string, intent: BookshelfIntent) => void;
  onCreate: (title: string) => boolean | void;
  onImport: (file: File) => void;
  disabled?: boolean;
  notice?: string;
  onIntroduction?:()=>void;
};

const sections = [
  {kind:"original",title:"원작",description:"선녀와 나무꾼·흥부전·옹고집전·별주부전의 원래 이야기를 읽어요."},
  { kind: "own", title: "내 작품", description: "이 기기에 저장한 이야기예요. 다시 열어 이어서 쓸 수 있어요." },
  { kind: "imported", title: "가져온 작품", description: "작품 파일에서 가져온 이야기예요. 이 기기에서 편집하고 보관할 수 있어요." },
  { kind: "example", title: "기본 예제", description: "읽어 보거나 내 이야기의 출발점으로 삼아 보세요." },
] as const;

function modifiedTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "수정 시점 정보 없음" : new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function LocalBookshelf({ works, onOpen, onCreate, onImport, disabled = false, notice,onIntroduction }: LocalBookshelfProps) {
  return <main className={styles.library} aria-label="로컬 서재">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>놀스토리 · 이 기기의 이야기</p><h1>내 서재</h1>
        <p>아이디어를 준비하고, 이야기를 쓰고, 다시 읽어 보세요.</p></div>
      {onIntroduction&&<button onClick={onIntroduction}>책 소개</button>}<a className={styles.shortstory} href="/shortstory">숏스토리 그림책 열기</a>
    </header>
    <div className={styles.create}>
      <NewStoryForm disabled={disabled} onCreate={title => onCreate(title) !== false} />
      <label className={styles.import}>작품 파일 가져오기
        <input type="file" accept=".knolstory" aria-label="서재 작품 파일 가져오기" disabled={disabled} onChange={event => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = "";
        }} />
      </label>
      <p>작품은 이 브라우저에 저장돼요. 다른 기기로 옮길 때는 작품 파일로 보관하세요.</p>
    </div>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {sections.map(section => {
      const entries = works.filter(work => work.kind === section.kind);
      return <section className={styles.section} key={section.kind} aria-label={section.title}>
        <div className={styles.sectionHeading}><h2>{section.title} <span>{entries.length}편</span></h2><p>{section.description}</p></div>
        {entries.length === 0 ? <p className={styles.empty}>{section.kind === "own" ? "아직 내 작품이 없어요. 새 작품을 만들어 첫 이야기를 시작해 보세요." : section.kind === "imported" ? "가져온 작품이 없어요. 보관한 .knolstory 파일을 열어 보세요." : "준비된 기본 예제가 없어요."}</p> :
          <div className={styles.grid}>{entries.map(work => <article className={styles.card} key={work.key} aria-label={`${section.title} · ${work.project.title}`}>
            <div className={styles.cover} aria-hidden="true"><BookCover project={work.project} compact /></div>
            <div className={styles.details}><h3>{work.project.title}</h3><p className={styles.description}>{work.project.description || "아직 작품 소개가 없어요."}</p>
              {work.project.cover?.author && <p className={styles.author}>지은이 · {work.project.cover.author}</p>}
              <p className={styles.modified}>최근 수정 · {modifiedTime(work.project.updatedAt)}</p>
              <div className={styles.actions}>
                <button disabled={disabled} onClick={() => onOpen(work.key, "edit")}>편집하기</button>
                <button disabled={disabled} onClick={() => onOpen(work.key, "prepare")}>작품 준비</button>
                <button disabled={disabled || work.project.lines.length === 0} onClick={() => onOpen(work.key, "start")}>처음부터 읽기</button>
                <button disabled={disabled || !work.canResume} onClick={() => onOpen(work.key, "resume")}>이어읽기</button>
              </div>
              <p className={styles.hint}>{work.canResume ? "이어읽기는 마지막으로 읽던 위치를 열어요." : "읽은 위치가 생기면 이어읽기를 사용할 수 있어요."}</p>
            </div>
          </article>)}</div>}
      </section>;
    })}
  </main>;
}
