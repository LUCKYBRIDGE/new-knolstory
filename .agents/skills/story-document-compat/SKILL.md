# Story Document Compatibility Skill

Use for official work files, authoring fields, Excel/Google adapters or existing Next works.

1. Read [storage contract](../../../docs/architecture/authoring-storage-contract.md), [current workbook guide](../../../docs/architecture/authoring-workbook-v2.md) and the relevant field inventory/ADR.
2. Keep StoryDocument (KnolStory) and ShortStoryProject as content sources. Official archive `formatVersion:2` wraps them; document schema, API payload and server revision are separate versions.
3. For plot score changes read the [score contract](../../../docs/architecture/score-narrative-contract.md) and [ADR0017](../../../docs/decisions/0017-story-score-authoring.md). Use explicit document/workbook migration; do not accept score fields under an older schema. Preserve score IDs, condition grouping, route priority and choice-effect order. Keep reader totals derived from Core playback history rather than adding them to work files.
4. Reuse `authoring-archive` validation and `authoring-workbook` adapters. Tables edit actual fields; do not conceal the whole document in a payload cell.
5. Preserve currently supported Next plain StoryDocument and ShortStory v1 through explicit adapters. Legacy story-maker files are outside the current authoring-format scope; fixed-baseline comparison does not imply support.
6. Reject unknown fields, duplicate JSON keys, invalid values and required execution/asset references and lossy normalization before storage writes. Preserve unset/empty/null/zero distinctions, IDs, array order and authored text. Memo links intentionally retain free character names and unresolved/deleted chapter/cut targets; do not apply Flow/asset existence rules to those planning references.
7. Keep Korean headings, notes, enum choices and stable hidden keys synchronized. Explain units and parent-ID connections; never translate free text or IDs.
8. Add meaningful RED→GREEN tests for changed behavior, whole-document/archive/workbook/xlsx/jsonb parity and representative existing works. Check actual external-app save/export for changes affecting those paths; programmatic xlsx parity alone is insufficient.
9. For schema changes run `node scripts/generate-authoring-schema.mjs --check`; regenerate through the generator when intentional, never hand-edit its output.

Apply [documentation governance](../../../docs/architecture/documentation-governance.md) when scope/contracts change. Completed evidence proves its recorded scope/date, not future edits.

For display units/workbook changes read [ADR0018](../../../docs/decisions/0018-authoring-seconds-and-terminology.md): current workbook seconds, explicit old milliseconds conversion, decimal precision and per-column aliases. Do not change archive/document time meaning merely to change the UI unit.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
