# KnolStory Final Architecture

```text
Web Service / Editor
        ↓
StoryDocument
        ↓
Runtime Core
        ↓
RuntimeScene
        ↓
JS ↔ Ren'Py Bridge
        ↓
Ren'Py Web Runtime
```

## Web owns
Accounts, roles, classes, assignments, submissions, publication, library, authoring UI, asset browsing, local-first editing and online persistence.

## Runtime Core owns
StoryDocument normalization, Flow, StageComposition, canonical Stage Layout, asset resolution, presentation semantics and RuntimeScene generation.

## Ren'Py owns
Actual stage rendering, dialogue/narration presentation, choices, actor focus, animation, transition, effects, BGM/SE and playback interaction.

## Permanent rules
- StoryDocument is content truth; `.rpy` is implementation.
- Editor Stage = Preview = Player = submission viewer = shared player = Ren'Py runtime.
- HTML editing overlay is not a second story renderer.
- Ren'Py does not become the account/class/submission platform.
- StoryDocument stores stable logical Asset IDs; Runtime Core resolves runtime paths.
- `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b` is the compatibility and UX reference baseline.
