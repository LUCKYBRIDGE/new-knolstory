# Legacy Baseline

- Repository: `LUCKYBRIDGE/story-maker`
- Commit: `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`
- Date: 2026-10-05

This commit is the fixed reference for compatibility, behavior and design continuity. It is not the Next implementation target.

```text
story-maker
    ↓ one-way inheritance
new-knolstory
```

High-value legacy areas:
- StoryDocument/schema migration
- StoryProject/StoryLine
- StageComposition and Stage Layout
- reader navigation/Flow
- Asset ID/taxonomy
- local-first persistence
- Story/ShortStory file formats
- representative works/tests
- UI/UX references and visual language

Classify each migrated subsystem as PRESERVE / REFINE / REBUILD / RETIRE.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
