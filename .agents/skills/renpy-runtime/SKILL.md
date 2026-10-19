# Ren'Py Runtime Skill

Use under `renpy/` or its bridge/build scripts.

1. Read [ADR 0014](../../../docs/decisions/0014-renpy-web-host-and-bridge-model.md), [responsive audio contract](../../../docs/architecture/responsive-audio-authoring.md) and current RuntimeScene guards.
2. Consume RuntimeScene/RuntimeCommand; do not parse StoryDocument or compute layout independently. Core owns flow/choice path/resume; Ren'Py emits requests/acknowledgements.
3. Keep one persistent runtime for the active editor/player. Apply scene logical size dynamically; fixed 1280×720 is only an initial probe, not the current layout invariant.
4. Validate incoming payloads through the current TypeScript guards used by the bridge. Final JSON Schema/CI completion remains a separately tracked requirement.
5. Drop stale sequence/revision messages and report rendered textbox/engine geometry. Preserve reset/replay, entry-level audio deduplication and reduced motion.
6. Keep confirmation transitions reachable with long Korean text at portrait/landscape sizes; audio unlock and presentation completion must permit normal story input afterward.
7. Product controls belong to KnolStory. Disable stock save/load/rollback/preferences/quick menu and keep accounts/classes/DB outside the runtime.
8. Reuse existing design-token pipeline and runtime styles; inspect implemented generation before assuming planned CSS/Ren'Py token parity is complete. Pin SDK in `renpy/RENPY_VERSION`; upgrades require dedicated review and evidence.
9. Run `pnpm runtime:build` **then** `pnpm build`, then affected static/native tests. Do not build runtime and Web concurrently or test an older `out` runtime.

Record source/build/limits through [documentation governance](../../../docs/architecture/documentation-governance.md).

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
