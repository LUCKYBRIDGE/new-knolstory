# Runtime Contract Skill

Use for RuntimeScene, commands/events, bridge or playback state.

1. Read [ADR 0014](../../../docs/decisions/0014-renpy-web-host-and-bridge-model.md), [runtime contract source](../../../packages/runtime-contract/src/index.ts) and current bridge/consumer.
2. Runtime Core alone interprets StoryDocument, Flow, StageComposition and presentation. Ren'Py receives versioned execution scenes/commands, never the document.
3. Update TypeScript types/guards, bridge mapping, Ren'Py consumer and meaningful contract tests together. The present bridge uses the current TypeScript guards; do not claim the planned final JSON Schema gate already exists.
4. Keep transport sequence/revision and playback entry semantics distinct. Reject malformed/stale payloads, preserve reset/replay and avoid repeating audio/transitions on same-entry revisions.
5. Current products generate only1280×720/720×1280. Keep optional artworkRect for old scene compatibility; no new classic format. Source offsets use Unicode code points; paginationFontSize is independent of displayfont. Keep one runtime and renderer acknowledgement across resize/fullscreen.
6. Keep CSS/Python/ATL implementation details out of authored documents. Schema/contract changes need explicit version/migration decisions, not casual field renaming.

Use [documentation governance](../../../docs/architecture/documentation-governance.md) for contract owners, plan changes and validation evidence.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
