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

## Toolchain (ADR 0012)

Node.js `>=22.13.0`, pnpm workspaces, Turborepo, Next.js static export, Vitest, Playwright, pinned Ren'Py SDK.
## Local representative-story workspace

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000` for the four representative manuscripts (선녀·흥부·옹고집·별주부). The Web editor adapts its panels and keeps one embedded Ren'Py instance. Build the real runtime first using [the Ren'Py build instructions](spikes/renpy-web/README.md). Without that build, the page retains editing inputs and reports the runtime as unavailable; it does not draw a substitute story stage. The original coordinate probe remains at `/probe`.

```sh
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:runtime
pnpm test:e2e:stories
pnpm test:presenter
```

`test:e2e` verifies editing, local saves, file round trips and error preservation. `test:e2e:runtime` verifies the coordinate probe at DPR 1/1.5/2; `test:e2e:stories` verifies actual assets, representative cuts, native choices and confirmation transitions across the four manuscripts. `test:presenter` checks actual Ren'Py effect pixels and event semantics. Runtime tests require the built WASM package. The workspace uses StoryDocument v5, imports older supported schemas and saves to the `knolstory-next-workspace-v1` namespace. Shared images download progressively rather than per story engine builds.

Scope and evidence: [representative-story verification](docs/architecture/representative-story-verification.md).

Design and acceptance criteria: [Responsive Runtime Editor](docs/architecture/responsive-runtime-editor.md).

## Test on another computer

The first browser visit opens **책 소개**. Enter the library, select an original or KnolStory book, and start reading from its cover. A returning visit opens the library; reloading restores the current saved screen. The library's **작품 준비 → 책 표지 편집** edits the front, spine and back cover with Apply/Cancel. Browser storage is local to that computer; use `.knolstory` export/import to move authored books.

The repository contains source, document fixtures, original procedural audio/effect resources and licensed cover fonts. **Legacy images and screenshots containing them are not published in this repository while their redistribution evidence remains unverified.** For authorized local testing with the existing legacy checkout, restore exact fixed-baseline media without overwriting the current Next source:

```sh
python3 scripts/restore-legacy-media.py ../story-maker
pnpm install --frozen-lockfile
```

Keep `story-maker` at a sibling path or pass another local path to the script. The script reads commit `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b` and verifies every restored file against the recorded SHA256. It does not change that checkout or grant redistribution rights. The restored art remains ignored by Git. For the actual Ren’Py story renderer, install the pinned SDK/Web dependencies and build it following [runtime setup](spikes/renpy-web/README.md), then run `pnpm dev` and open `http://localhost:3000`. The runtime output and SDK cache are generated locally and ignored by Git. macOS/Linux can run the documented shell build; Windows can use WSL2 for that build. This is a local test setup, not a public release approval.

The original/forked manuscripts' project data and audio cues are in [existing-work evidence](docs/architecture/existing-story-enhancement.md). Cover and entry workflow evidence and remaining limitations are in [book-entry verification](docs/architecture/book-entry-and-cover.md).

`story-maker` is a private repository. Use your existing authorized GitHub account to check it out beside Next; no new repository secret or access grant is installed by this task. Public GitHub CI runs source/type/lint/build/contract checks and explicitly excludes the private-media file-by-file test. Full local `pnpm test:coverage` and Chrome/Ren’Py verification require the restored private media and are recorded in the verification documents.
