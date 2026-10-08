# DESIGN.md — KnolStory Next Design & UX SSOT

## Goal
KnolStory Next should clearly feel like the evolved form of existing KnolStory: familiar identity, materially better usability.

**Continuity is not preservation.** Preserve validated mental models and identity; improve or rebuild layouts and implementation that create wasted space, clipping, inconsistency, accessibility problems or duplicated rendering.

## Legacy references
For major UI work inspect the corresponding parts of `LUCKYBRIDGE/story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`, especially:
- `Knolstory_Story_Composition_UIUX_Redesign_Reference_v1.1.md`
- `story-maker_ui_ux_refactor_prompt.md`
- `app/globals.css`
- `app/StoryStudio.tsx`
- `app/components/SceneFocusEditor.tsx`
- `app/components/StoryPlayer.tsx`
- `app/components/StoryStage.tsx`
- cover design files
- `app/story-speaker-colors.ts`

Reference is evidence, not a pixel-copy command.

## First and returning visits

Owner clarification (2026-10-08): preserve the legacy distinction between the first visit's book-introduction home and the returning visit's library. The introduction home, the library, and an individual book's cover/start screen are separate surfaces. Next now implements this distinction with a separate book-introduction home, a returning-visit library, and a per-book cover/start surface. Reload restores the saved current screen; fresh return starts in the library while retaining each work's editing and reading context. Detailed evidence: docs/architecture/book-entry-and-cover.md.

The fixed baseline uses `app/story-landing-visit.ts` and `StoryStudio.tsx`: initial discovery screen is `home`, a browser-local visited preference selects `library` on returning visits, and saved navigation can restore a later context. A Next implementation must use its own `knolstory-*` preference and preserve saved work/read state without writing legacy `storygame*` keys. The visit preference belongs to the browser, not the StoryDocument or exported book.

## 2026-10-08 소개·서재·책 디자인 계승

소유자는 고정 story-maker의 소개 화면·서재·책 디자인 시스템을 직접 재사용해도 된다고 승인하고, Next에서 동급의 품질·완성도를 요구했다. 포스터형 첫 진입, 목재 서가, 판본 구분, 선택한 책의 집중 화면, 양장본 마감과 세 면 직접 편집을 현재 StoryDocument/로컬 저장/단일 Ren’Py 경계에 맞춰 계승한다. 표지 내용과 실제 이야기는 별개이며 동작·파일 보존 및 반응형 화면으로 검증한다. 구현 분류·근거: docs/architecture/library-book-design-parity.md. 사용자가 기존 프로젝트의 저작권자로서 재사용을 허용했다. 방 이미지도 고정 checkout에서 복원하며 출처·해시와 소유자 재사용 허가를 기록한다.

## Classification
- **PRESERVE:** warm storybook identity, Korean readability, story-first surfaces, student-friendly controls, clear current context.
- **REFINE:** spacing, density, typography hierarchy, chapter/cut/branch navigation, asset picker, panels, forms, responsive behavior.
- **REBUILD:** Story Stage, Player renderer, preview renderer, Web-only animations/effects and standalone share renderer.
- **RETIRE:** duplicated CSS, arbitrary per-screen values, nested-card inflation, text clipping, unexplained blank space, default Ren'Py GUI.

## Legacy visual baseline
```css
--font-ui: Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
--font-story: "Iowan Old Style", "Noto Serif KR", serif;
--radius-control: 12px;
--radius-panel: 16px;
--control-h-primary: 48px;
--control-h-default: 44px;
--control-h-compact: 36px;
--control-hit-min: 44px;
--paper: #f7f3e9;
--paper-deep: #eee5d5;
--ink: #183331;
--ink-soft: #4c625f;
--line: #d8d0c2;
--white: #fffdf8;
--mint: #d6eadf;
--mint-strong: #2f7d68;
--gold: #e7aa42;
--gold-soft: #f8e6b8;
--coral: #d8644d;
--navy: #163943;
--color-danger: #b42318;
```
These are starting values, not immutable constants.

## Visual character
Warm + storybook + creative + calm + playful-enough + modern organization.
Avoid cold enterprise SaaS, noisy primary-color children's UI, generic game-launcher visuals and stock Ren'Py skin.

## Story workspace
```text
┌─────────────────────────────────────────────────────┐
│ Global Header                                       │
├─────────────────────────────────────────────────────┤
│ Chapter / Branch Context                            │
├──────────┬─────────────────────────────┬────────────┤
│ Cut List │ Ren'Py Stage + Edit Overlay │ Inspector  │
├──────────┴─────────────────────────────┴────────────┤
│ Previous | Current Cut | Next | Add                 │
└─────────────────────────────────────────────────────┘
```
Use viewport space efficiently. Keep Stage prominent. Panels may collapse. Authored text must not be clipped.

## Context
Current target expanded; previous context compact but present. Avoid automatic collapse that moves active input.

## Text
Dialogue, narration, choice bodies, editable titles/descriptions and error/save-failure messages wrap and preserve meaning.

## Controls
Baseline: primary 48px, default 44px, compact visual 36px, minimum hit target 44px.

## Final Story Stage
`Editor Stage = Preview = Player = Shared Player = Ren'Py Web Runtime`.
Web provides authoring chrome and editing overlay only.

- **Edit Overlay** positions handles from RuntimeScene logical coordinates (Runtime Core layout), scaled to the displayed Stage. It never measures the canvas or recomputes layout. Textbox bounds come from the Ren'Py `sceneRendered` report (ADR 0014).
- Runtime Core derives the logical Stage aspect ratio from the actual story display area. Desktop/phone portrait/phone landscape previews use the same rules. Ren’Py changes its virtual dimensions within the persistent runtime; Web only projects the resolved Stage. Preview preset letterboxes use paper tones. See `docs/architecture/responsive-audio-authoring.md`.
- The first responsive editor probe uses a 1280×720 logical stage (16:9 candidate). Editor panels adapt independently. Resizing must preserve the runtime instance, current selection and authored coordinates. Touch handles retain at least 44 CSS px hit areas. Detailed rules: `docs/architecture/responsive-runtime-editor.md`.

## Ren'Py skin
Never expose stock quick menu, dialogue, choices, save/load or preferences as product UI.
Ren'Py colors, fonts, radii and spacing are generated from `packages/design-tokens` — never hand-copied into `.rpy`.

## ShortStory exception
ShortStory pages and A4 print are rendered by Web/CSS (ADR 0009). They use the same design tokens and must look like the same product, but they are not a model for KnolStory chapter/cut playback.

## Responsive
Device tiers are defined in ADR 0013. Chrome is the initial supported browser; Safari / iPad·iPhone are outside the current implementation and QA scope.

- **Wide (Tier 1 PC/Chromebook):** Cut | Stage | Inspector
- **Medium (Tier 1 tablet):** Stage + collapsible side panels; touch-first controls
- **Narrow (Tier 2 phone):** one primary task at a time. Stage on top (reduced size allowed), the active editor as a bottom sheet. Core editing must be reachable: text, speaker, background/character, choices, add/move cut. Full flow map and bulk asset work may be simplified.
- Orientation changes must not lose the current cut, selection or unsaved input.

## Accessibility and QA
Require visible keyboard focus, touch support, reduced-motion consideration, non-color-only status, no clipped author text, consistent controls, no unexplained blank space and Web/Ren'Py visual continuity.

- Canvas text is mirrored to a DOM semantic layer: `aria-live` speaker + line, real `<button>` choices, focusable advance control (ADR 0015).
- Reduced motion (OS setting or in-app) is passed to Ren'Py and honored by every effect/transition.
- Speaker colors are never the only speaker cue; the speaker name is always present.

## Final principle
The legacy product is the starting point for a better KnolStory, not a constraint preventing improvement.
