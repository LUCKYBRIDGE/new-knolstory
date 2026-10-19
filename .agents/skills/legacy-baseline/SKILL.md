# Legacy Baseline Skill

Use when comparing behavior, data, assets or UI with story-maker.

1. Read [legacy parity record](../../../docs/architecture/legacy-parity-implementation.md) and [compatibility matrix](../../../docs/migration/compatibility-matrix.md) for prior decisions before repeating work.
2. Inspect exact paths with `git show 18da4fc:<path>` at fixed `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`, never the clone's current branch.
3. Treat legacy as read-only. Classify inheritance PRESERVE / REFINE / REBUILD / RETIRE and actual Next state implemented/partial/missing/intentional change.
4. Reuse working Next capabilities and verify the full user path. A button/link or copied implementation alone is not functional parity.
5. Preserve meaning, originals and evidence; record deliberate changes. Legacy file compatibility is outside the completed Next authoring-format goal and needs a separately authorized scope.
6. Record any justified post-baseline forward port in [forward-port log](../../../docs/migration/forward-port-log.md).

Use [documentation governance](../../../docs/architecture/documentation-governance.md) to amend plans without rewriting historical evidence as current truth.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
