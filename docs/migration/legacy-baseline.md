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
