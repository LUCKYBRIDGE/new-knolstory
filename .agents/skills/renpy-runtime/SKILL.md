# Ren'Py Runtime Skill

Use under `renpy/`.

- Consume RuntimeScene/RuntimeCommand; do not parse StoryDocument as a second engine.
- Own visual/audio playback, not account/class/submission/DB logic.
- Use KnolStory design language; never expose stock Ren'Py UI as product UI.
- Prefer one persistent runtime per active editor/player surface.
- Preserve deterministic scene reset/replay.
