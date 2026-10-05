# Compatibility Matrix

기준: `story-maker@18da4fc`. 각 행은 M2(도메인과 호환) 이후 자동 테스트 1개 이상과 연결돼야 한다.

| Area | Next requirement | 담당 | 근거 |
|---|---|---|---|
| .knolstory | Open without semantic loss; write current schema | `compatibility` | ADR 0001 |
| .nolstory v1 | Read (import only) | `compatibility` | legacy `docs/decisions/nolstory-file-v1.md` |
| StoryDocument | Schemas v1–v5 migrate to current (`CURRENT_SCHEMA_VERSION = 5` at baseline) | `story-domain` | legacy `app/story-project-document.ts` |
| Asset ID | Existing references resolve; asset revisions honored | `asset-registry` | |
| StageComposition | Placement meaning preserved (max 2 per side, 4 total, focus/listener, depth) | `runtime-core` | legacy ADR stage-composition-v1 |
| Stage Layout | Alpha-silhouette layout meaning preserved; numeric parity within tolerance | `runtime-core` | Blueprint v1.4 M4 |
| Flow | Choice (2–4)/goto/merge/ending; `null` ending ≠ `""` pending link; teacher-approval condition | `story-domain`, `runtime-core` | legacy ADR story-flow-v1 |
| Reader path | Existing branch continuity, resume position, cover/end state | `runtime-core`, `apps/web` | |
| Dialogue/narration | Text/speaker meaning preserved; speaker name ≠ character image | `story-domain` | |
| Presentation | v1 effect → v2 presentation semantic mapping; per-cut explicit look | `runtime-core` | legacy 연출 시스템 개발안 v2 |
| Cover | Existing cover data readable | `story-domain` | |
| ShortStory | `.shortstory` + manifest readable; Web render + A4 print | `compatibility`, `apps/web` | ADR 0009 |
| Excel (놀스토리 8탭) | Import/export round-trip | `compatibility` | ADR 0009 (기본 가정) |
| Excel (숏스토리 4탭) | Import/export round-trip | `compatibility` | ADR 0009 (기본 가정) |
| Public Google Sheet | One-time read | `compatibility` | ADR 0009 (기본 가정) |
| Local storage (IDB `nolstory-workspace-v1`, `storygame*` keys, reading progress, display settings, shortstory repo) | Auto-migrate on same origin; never mutate originals | `compatibility`, `apps/web` | ADR 0010 |
| Server payload v1 (draft/playback, shortstory manifest v1) | Read and write | `server`, `compatibility` | ADR 0011 |
| Share / remix (`allowRemix`, publication fingerprint) | Policy preserved | `story-domain`, `server` | |
| Offline HTML export | Not produced (existing files still open as-is) | — | ADR 0009 RETIRE |
| Legacy Web renderer internals | Not required | | |
| Legacy Web animation internals | Not required | | |
| Legacy CSS structure | Not required | | |
