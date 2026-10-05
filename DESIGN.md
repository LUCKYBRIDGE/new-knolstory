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
- Stage keeps a fixed logical aspect ratio and letterboxes; letterbox areas use paper tones, not black, in editor surfaces.

## Ren'Py skin
Never expose stock quick menu, dialogue, choices, save/load or preferences as product UI.
Ren'Py colors, fonts, radii and spacing are generated from `packages/design-tokens` — never hand-copied into `.rpy`.

## ShortStory exception
ShortStory pages and A4 print are rendered by Web/CSS (ADR 0009). They use the same design tokens and must look like the same product, but they are not a model for KnolStory chapter/cut playback.

## Responsive
Device tiers are defined in ADR 0013.

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
