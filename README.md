# KnolStory Next

차세대 놀스토리 공식 개발 저장소.

- Legacy reference: `LUCKYBRIDGE/story-maker` (feature-frozen)
- Legacy baseline: `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`
- Successor repository: `LUCKYBRIDGE/new-knolstory`

## Product direction

KnolStory is a Web-based educational story creation service.
`StoryDocument` remains the canonical source of truth.
The Web app owns service and authoring UX, the Runtime Core interprets story semantics and owns playback state, and Ren'Py Web is the official embedded Story Runtime.
ShortStory (picture book + A4 print) remains Web-rendered.

## Read first

1. [`AGENTS.md`](AGENTS.md) — rules for every contributor and AI agent
2. [`STATUS.md`](STATUS.md) — current milestone, owner decisions, open questions
3. [`docs/architecture/development-blueprint.md`](docs/architecture/development-blueprint.md) — Blueprint v1.4: milestones and completion definition
4. [`DESIGN.md`](DESIGN.md) — design/UI/UX SSOT
5. [`docs/decisions/`](docs/decisions/README.md) — ADRs

## Toolchain (planned, ADR 0012)

Node.js `>=22.13.0`, pnpm workspaces, Turborepo, Next.js static export, Vitest, Playwright, pinned Ren'Py SDK.
Commands will be documented here once the M1a scaffold lands.
