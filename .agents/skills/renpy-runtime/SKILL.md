# Ren'Py Runtime Skill

Use under `renpy/`.

- Consume RuntimeScene/RuntimeCommand; do not parse StoryDocument as a second engine.
- Own visual/audio playback, not account/class/submission/DB logic.
- Use KnolStory design language; never expose stock Ren'Py UI as product UI.
- Prefer one persistent runtime per active editor/player surface.
- Preserve deterministic scene reset/replay.

## Bridge and state (ADR 0014)

- Ren'Py is a presenter. Flow, next-cut decisions, choice history and resume are owned by Runtime Core in the Web host. Ren'Py only emits events (`advanceRequested`, `choiceSelected`, `presentationDone`, …).
- Disable Ren'Py save/load, rollback, preferences and quick menu.
- Render actor positions exactly as given in RuntimeScene logical coordinates. Do not compute layout in Python/ATL.
- Report the rendered textbox rect in `sceneRendered`; the Web Edit Overlay depends on it.
- Drop stale messages by `seq`; render only the latest `revision`.
- Validate every payload against the generated JSON Schema from `packages/runtime-contract`.
- Honor `reducedMotion` in every transition/effect.
- Style constants come from the generated `tokens.rpy` (design-tokens). Do not hand-edit colors/fonts.
- Pin the SDK version in `renpy/RENPY_VERSION`; upgrades need a dedicated PR with runtime QA evidence.
