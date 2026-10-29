# AGENTS.md — KnolStory Next

## Identity
Official successor to `LUCKYBRIDGE/story-maker`.
Legacy baseline: `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`.
Normal Next development happens only in `LUCKYBRIDGE/new-knolstory`.

## Architecture
```text
Web Service / Editor
        ↓
StoryDocument
        ↓
Runtime Core
        ↓
RuntimeScene
        ↓
Ren'Py Web Runtime
```

- Web owns service UX, editor chrome, accounts, classes, assignments, submissions, sharing and local-first persistence.
- Runtime Core owns canonical interpretation of StoryDocument, Flow, StageComposition, Stage Layout, Asset resolution and Presentation semantics.
- Ren'Py Web owns actual story rendering, dialogue/narration, choices, animation, transition, effects and audio.
- Server owns auth, permissions and online service data.

## Non-negotiable rules
1. StoryDocument/`.knolstory` is the content SSOT. Never make `.rpy` the work format.
2. Existing works, Asset IDs, Flow and StageComposition semantics require explicit compatibility/migration.
3. Ren'Py consumes versioned RuntimeScene/RuntimeCommand contracts; it does not reinterpret StoryProject independently.
4. Canonical Stage Layout exists once in Runtime Core.
5. Do not build one Ren'Py package per story/student.
6. Do not put class/account/submission/DB logic in Ren'Py.
7. Final official story renderer is Ren'Py Web; do not grow a permanent second Web Player.
8. UI work reads `DESIGN.md` first. Current editing work follows its latest task-screen rules: basic scene editing plus multi-cut text/background/character/audio/direction views, optional read-only companion information, and explicit advanced-editor opt-in. Check mockup supersession before reusing an old design.
9. Legacy continuity is a baseline, not a freeze. Improve UX, accessibility, performance, architecture and presentation when better.
10. Do not modify `story-maker` as part of ordinary Next work. Legacy is feature-frozen; post-baseline legacy fixes are tracked in `docs/migration/forward-port-log.md` (ADR 0011).
11. Ren'Py never receives StoryDocument. Playback state (current cut, choice path, resume) is owned by Runtime Core in the Web host (ADR 0014).
12. ShortStory page rendering and A4 print stay in Web/CSS — the only allowed Web renderer exception (ADR 0009). Never reuse it for KnolStory chapter/cut playback.
13. Never work around Ren'Py constraints or performance budgets with a separate Web Stage renderer. Adjust runtime configuration, asset strategy or UX instead.
14. Never delete or mutate legacy local storage (IDB `nolstory-workspace-v1`, `storygame*` keys). New storage uses the `knolstory-*` namespace (ADR 0010).
15. No absolute local paths in scripts, config or doc references. The repo is used from more than one machine path; ADR 0012 is the only place that records them.
16. Read legacy behavior from the baseline commit (`git show 18da4fc:<path>`), not from whatever branch a local legacy clone has checked out.

정적 웹 독립 후속은 [ADR0026](docs/decisions/0026-static-reading-authoring-and-optional-api.md)을 따른다. 공개 읽기·편집/공용 자산과 선택적 온라인 API를 분리하되 기존 같은 출처 Ren’Py 메시지 계약과 권리 gate를 유지한다. URL 문자열 치환만으로 CDN 이전이나 배포 완료를 주장하지 않는다.

## Before coding
Read: `AGENTS.md` → `STATUS.md` → `docs/architecture/development-blueprint.md` → `DESIGN.md` when relevant → relevant ADR → relevant `.agents/skills/*/SKILL.md`.
Open questions listed in `STATUS.md` are not decided; do not implement around them silently.
Read `docs/architecture/documentation-governance.md` when updating plans, instructions, contracts, skills or completion claims. Plans are revisable: preserve evidence, identify changed scope/dependencies and update the canonical owner in the same change. A newer explicit user decision governs its scope; do not silently turn a historical plan into a present requirement.
Current authoring format and composition quality take priority over old-format compatibility. Do not freeze new fields, structure or UX to match earlier files; preserve existing Next authored content through explicit validation/migration where meaning changes.
For current formats, read ADR 0016 and the authoring storage/workbook contracts. Legacy feature audits still use the fixed baseline, but legacy file codecs are not automatically required by a Next-only task.
Keep `.agents/skills/` task procedures linked to current contracts; do not duplicate live status/test counts. Preserve framework-managed instruction blocks such as `apps/web/AGENTS.md`. Shared/global skill edits require an explicitly scoped request; this project owns its local skills only.

## Legacy classification
Every inherited subsystem is classified as **PRESERVE / REFINE / REBUILD / RETIRE** before large migration work.

## Direction
Inheritance is one-way: `story-maker → new-knolstory`. Do not maintain bidirectional synchronization.

## 제품 용어의 공통 기준

현재 문서·UI·도움말·접근성 이름·프로젝트 스킬은 [제품 용어 사용 기준](docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 같은 작품 파일의 이름을 새로 나누지 않고, 임시 보관·독자 진행 저장·지난기록·이전 원고의 대상을 구분한다. 변경할 때 관련 이름과 설명·검사를 함께 맞추고 `pnpm docs:check`와 `pnpm test:docs`를 통과시킨다. 과거 검증·원고·파일키·고정 양식 값과 프레임워크 관리 지침은 용어 통일을 이유로 덮어쓰지 않는다.
