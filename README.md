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
pnpm env:prepare --legacy ../story-maker
pnpm preview
```

Open `http://127.0.0.1:3000` for the eight editions (four original manuscripts and four KnolStory editions). The Web editor adapts its panels and keeps one embedded Ren'Py instance. The preparation command builds the real runtime and static app; [detailed prerequisites and recovery](docs/architecture/reproducible-test-environment.md) are below. Use `pnpm dev` for source editing. Without that build, the page retains editing inputs and reports the runtime as unavailable; it does not draw a substitute story stage. The original coordinate probe remains at `/probe`.

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

Use the `codex/book-entry-cover` branch while [PR #1](https://github.com/LUCKYBRIDGE/new-knolstory/pull/1) is open; these features are not yet merged into `main`. Clone with `git clone --branch codex/book-entry-cover https://github.com/LUCKYBRIDGE/new-knolstory.git`, then enter that checkout.

The first browser visit opens **책 소개**. Enter the library, select an original or KnolStory book, and start reading from its cover. A returning visit opens the library; reloading restores the current saved screen. In **놀스토리 서재**, select a book and open **책 꾸미기·작품 도구 → 책 표지 편집** to edit the front, spine and back cover with Apply/Cancel. The selected book tools also provide file backup. The library keeps a compact title, book classification and collapsed **작품 관리** menu. Open that menu for search, new books or file import. Browser storage is local to that computer; use `.knolstory` export/import to move authored books.

The repository contains source, document fixtures, original procedural audio/effect resources and licensed cover fonts. **Legacy images and screenshots containing them are not published in this repository while their redistribution evidence remains unverified.** For authorized local testing with the existing legacy checkout, restore exact fixed-baseline media without overwriting the current Next source:

Prerequisites: Git, Node.js `>=22.13.0`, the `pnpm@10.33.0` pinned in `package.json`, Python `>=3.9`, and an **existing authorized** `story-maker` checkout containing the baseline commit. Enable Corepack if necessary (`corepack enable`). On Windows run preparation inside WSL2 with Linux Node/pnpm/Python; native Windows and school/Android hardware have not been validated.

```sh
pnpm env:prepare --legacy ../story-maker
pnpm env:doctor
pnpm preview
```

Open `http://127.0.0.1:3000`. Preparation restores and hashes the fixed 421 story assets plus ten library/introduction UI images, installs the lockfile, downloads and verifies the pinned SDK/Web/font, installs Playwright Chromium, builds the shared Ren’Py runtime, then builds the static app. `preview` serves that build on loopback. `pnpm dev` is available for source editing. Preparation does not clone the private repository, install credentials or change legacy source. Pass a different authorized checkout path with `--legacy`; quote paths containing spaces.

An SDK previously installed by hand must be adopted once using `pnpm runtime:prepare --reinstall`, then rerun preparation. This replaces only the generated SDK after the pinned archives have been verified and staged. Invalid cached downloads are preserved and reported; remove the named invalid cache file and retry. Linux/WSL browser launch may additionally need `pnpm exec playwright install-deps chromium` (system administrator privileges). Full commands, recovery, file transfer and validation boundaries: [reproducible test environment](docs/architecture/reproducible-test-environment.md).

```sh
pnpm env:verify
```

The verification command checks scripts, types, lint, full coverage and media provenance, then runs the existing introduction/cover/archive browser tests, all eight real Ren’Py entries and both routes of the cover-edited Heungbu work. It uses the static build and installed Chromium by default. Set `KNOL_BROWSER_CHANNEL=chrome` to explicitly test installed Google Chrome. Stop any server on port 3000 before verifying; the static test server does not silently reuse it. Generated SDK/runtime output, restored private media and screenshots remain ignored by Git. This is a local test setup, not a public release approval.

Library and book-design continuity, direct cover editing and validation: [legacy design parity](docs/architecture/library-book-design-parity.md). The ten UI images (room, shelf, plant, two foreground decorations, four rectangular posters and logo) are restored from the fixed legacy checkout; the owner-authorized reuse and exact hashes are recorded in the restoration manifest.

The original/forked manuscripts' project data and audio cues are in [existing-work evidence](docs/architecture/existing-story-enhancement.md). Cover and entry workflow evidence and remaining limitations are in [book-entry verification](docs/architecture/book-entry-and-cover.md).

`story-maker` is a private repository. Use your existing authorized GitHub account to check it out beside Next; no new repository secret or access grant is installed by this task. Public GitHub CI runs source/type/lint/build/contract checks and explicitly excludes the private-media file-by-file test. Full local `pnpm test:coverage` and Chrome/Ren’Py verification require the restored private media and are recorded in the verification documents.
