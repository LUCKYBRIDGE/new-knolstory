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
8. UI work reads `DESIGN.md` first.
9. Legacy continuity is a baseline, not a freeze. Improve UX, accessibility, performance, architecture and presentation when better.
10. Do not modify `story-maker` as part of ordinary Next work. Legacy is feature-frozen; post-baseline legacy fixes are tracked in `docs/migration/forward-port-log.md` (ADR 0011).
11. Ren'Py never receives StoryDocument. Playback state (current cut, choice path, resume) is owned by Runtime Core in the Web host (ADR 0014).
12. ShortStory page rendering and A4 print stay in Web/CSS — the only allowed Web renderer exception (ADR 0009). Never reuse it for KnolStory chapter/cut playback.
13. Never work around Ren'Py constraints or performance budgets with a separate Web Stage renderer. Adjust runtime configuration, asset strategy or UX instead.
14. Never delete or mutate legacy local storage (IDB `nolstory-workspace-v1`, `storygame*` keys). New storage uses the `knolstory-*` namespace (ADR 0010).
15. No absolute local paths in scripts, config or doc references. The repo is used from more than one machine path; ADR 0012 is the only place that records them.
16. Read legacy behavior from the baseline commit (`git show 18da4fc:<path>`), not from whatever branch a local legacy clone has checked out.

## Before coding
Read: `AGENTS.md` → `STATUS.md` → `docs/architecture/development-blueprint.md` → `DESIGN.md` when relevant → relevant ADR → relevant `.agents/skills/*/SKILL.md`.
Open questions listed in `STATUS.md` are not decided; do not implement around them silently.

## Legacy classification
Every inherited subsystem is classified as **PRESERVE / REFINE / REBUILD / RETIRE** before large migration work.

## Direction
Inheritance is one-way: `story-maker → new-knolstory`. Do not maintain bidirectional synchronization.
