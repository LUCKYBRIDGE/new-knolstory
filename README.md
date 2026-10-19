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
6. [문서/계획 변경 관리](docs/architecture/documentation-governance.md) — 정식 소유 문서와 변경 절차

## Toolchain (ADR 0012)

Node.js `>=22.13.0`, pnpm workspaces, Turborepo, Next.js static export, Vitest, Playwright, pinned Ren'Py SDK.
## Local representative-story workspace

먼저 아래 [다른 컴퓨터 준비](#test-on-another-computer)의 음원 복원 단계를 수행한다. `env:prepare`는 공용 음원 패키지나 조건부 Pixabay 파일을 자동 취득하지 않는다.

```sh
pnpm env:prepare --legacy ../story-maker
pnpm preview
```

Open `http://127.0.0.1:3000` for the four works: 별주부전, 옹고집전, 선녀와 나무꾼 and 흥부와 놀부. Select a book for its original manuscript, KnolStory edition or ShortStory picture book; all eight story manuscripts remain separate and intact. The Web editor adapts its panels and keeps one embedded Ren'Py instance. The preparation command builds the real runtime and static app; [detailed prerequisites and recovery](docs/architecture/reproducible-test-environment.md) are below. Use `pnpm dev` for source editing. Without that build, the page retains editing inputs and reports the runtime as unavailable; it does not draw a substitute story stage. The original coordinate probe remains at `/probe`.

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

## Official authoring formats

현재 Next 저작 요소의 `.knolstory`/`.shortstory` archive v2와 한글 다중 탭 Excel/Google 교환을 제공한다. [사용 안내](docs/architecture/authoring-workbook-v2.md), [저장/API·JSONB 계약](docs/architecture/authoring-storage-contract.md), [현재 완료 증거](docs/architecture/authoring-format-completion-audit.md)를 따른다. 숨겨진 프로젝트 JSON에 의존하지 않는 편집 표이며, 과거 story-maker 파일 호환은 현재 범위가 아니다 (ADR0016).

저장 key/DB 이름은 `knolstory-next-workspace-v1`/`knolstory-audio-assets-v1`로 유지하고 내부 workspace payload/IndexedDB schema는 v2다. 문서 schemaVersion·파일 formatVersion·서버 payloadVersion과 저장 namespace를 혼동해 저장소를 재생성하지 않는다. 실제 API/DB·계정·학급 서비스는 아직 후속 단계다.

문서/스킬 변경 확인: `pnpm docs:check` 및 `pnpm test:docs`. Runtime을 다시 만들 때는 `pnpm runtime:build` → `pnpm build` → 필요한 검증을 순서대로 수행한다.

## Test on another computer

다른 컴퓨터에서는 GitHub `main`의 최신 커밋을 기준으로 시작한다. 기존 체크아웃에 미커밋 원고나 코드가 있다면 먼저 보존하고, 강제 초기화 대신 `git pull --ff-only`로 갱신한다. 새 체크아웃은 다음과 같이 준비한다.

```sh
git clone --branch main https://github.com/LUCKYBRIDGE/new-knolstory.git
cd new-knolstory
corepack enable
pnpm install --frozen-lockfile
pnpm docs:check
pnpm test:docs
pnpm typecheck
pnpm --filter @knolstory/web build
```

마지막 명령은 Web 소스의 정적 컴파일 검사다. 별도 복원이 필요한 자료와 Ren’Py 실행 파일까지 준비됐다는 뜻은 아니다. 전체 제품 개발은 [단일 실행 계획](docs/architecture/product-completion-plan.md)의 현재 재개 지점과 [다음 세션 진입점](docs/architecture/next-session-goal-prompt.md)을 따른다. 실제 작품 파일은 별도로 옮겨 다시 열며, 다른 컴퓨터의 브라우저 임시 보관은 Git으로 이동하지 않는다.

The first browser visit opens **책 소개**. Enter the library and select one of the four books. Choose **원작 읽기**, **놀스토리 읽기** or **숏스토리 읽기**. The first two open the selected edition’s cover and actual Ren’Py story; the picture book opens the Web reader. A fresh visit, including a returning visit, stays on the introduction until a button is chosen; reloading restores the current saved screen. In **놀스토리 서재**, select a book, choose its **바탕 판본** and open **책 꾸미기·작품 도구 → 책 표지 편집** to edit the front, spine and back cover with Apply/Cancel. The selected book tools also provide file backup. The library keeps a compact title, book classification and collapsed **작품 관리** menu. Open that menu for search, new books or file import. Basic books are preserved: editing creates **내 사본** of the stated edition. Personal and imported books remain independent; their tools allow copying, confirmed deletion and recovery of the most recently deleted book. Browser storage is local to that computer; use `.knolstory` export/import to move authored books.

The four **숏스토리** originals reuse the fixed legacy illustration packs and text. Reading, editing a personal copy, storing several picture books and reopening them live at `/shortstory/`. Use official `.shortstory` v2 or full Excel workbooks to move picture books; prior Next TSV is a limited path and **A4 인쇄** to print them. Unsupported legacy v2/old spreadsheet formats are rejected explicitly; see [format and preservation boundaries](docs/architecture/four-work-shortstory.md). [Current comparison audit and follow-up goals](docs/architecture/four-work-library-audit.md) distinguish local functionality from server-dependent accounts, classes, assignments and sharing.

The repository contains source, document fixtures, original procedural audio/effect resources and licensed cover fonts. **Legacy images and screenshots containing them are not published in this repository while their redistribution evidence remains unverified.** For authorized local testing with the existing legacy checkout, restore exact fixed-baseline media without overwriting the current Next source:

Prerequisites: Git, Node.js `>=22.13.0`, the `pnpm@10.33.0` pinned in `package.json`, Python `>=3.9`, and an **existing authorized** `story-maker` checkout containing the baseline commit. Enable Corepack if necessary (`corepack enable`). On Windows run preparation inside WSL2 with Linux Node/pnpm/Python; native Windows and school/Android hardware have not been validated.

`env:prepare` 전에 다음 음원을 복원한다. 음원 원본, SDK 및 생성한 런타임은 소스 체크아웃에 모두 포함되지 않는다.

1. 추가 CC0 음원 469개는 [CC0 편입 계획의 재현 절차](docs/architecture/cc0-library-integration-plan.md#재현)를 따른다. 고정 Release `audio-cc0-staging-2026-10-13-v1`의 ZIP을 내려받고, 문서의 크기·SHA256·ZIP 경로와 패키지 검증을 통과한 뒤 `scripts/integrate-staged-audio.py`로 복원한다. 브랜치 전체나 ZIP으로 현재 코드를 덮어쓰지 않는다.
2. 조건부 Pixabay 14개는 사용 권한이 있는 기존 로컬 환경의 승인된 파일을 **같은 상대 경로** `apps/web/public/assets/audio/pixabay/` 아래로 옮긴다. 일반 원음 배포용 GitHub 파일로 제공하지 않는다. 정확한 파일 경로·SHA256은 `packages/asset-registry/src/pixabay-audio.json` 및 `audio-service-approvals.json`을 따른다. 해당 파일이 없다면 실제 재생 환경 준비는 미완료이며 임의의 다른 음원으로 대체하지 않는다.
3. `pnpm test:service-audio`로 모든 승인 원본의 존재·해시·권리 증거를 확인한 뒤 전체 준비를 실행한다. 실제 런타임 ZIP을 만든 후에도 `pnpm build`와 같은 검사를 통과해야 한다. 이 검사는 권리 범위를 확대하거나 배포 승인을 대신하지 않는다.

```sh
pnpm test:service-audio
pnpm env:prepare --legacy ../story-maker
pnpm env:doctor
pnpm preview
```

Open `http://127.0.0.1:3000`. Preparation restores and hashes the fixed 421 story assets plus ten library/introduction UI images, installs the lockfile, checks the separately restored service audio, downloads and verifies the pinned SDK/Web/font, installs Playwright Chromium, builds the shared Ren’Py runtime, then builds the static app. `preview` serves that build on loopback. `pnpm dev` is available for source editing. Preparation does not clone the private repository, install credentials or change legacy source. Pass a different authorized checkout path with `--legacy`; quote paths containing spaces.

An SDK previously installed by hand must be adopted once using `pnpm runtime:prepare --reinstall`, then rerun preparation. This replaces only the generated SDK after the pinned archives have been verified and staged. Invalid cached downloads are preserved and reported; remove the named invalid cache file and retry. Linux/WSL browser launch may additionally need `pnpm exec playwright install-deps chromium` (system administrator privileges). Full commands, recovery, file transfer and validation boundaries: [reproducible test environment](docs/architecture/reproducible-test-environment.md).

```sh
pnpm env:verify
```

The verification command checks scripts, types, lint, full coverage and media provenance, then runs the existing introduction/cover/archive browser tests, all eight real Ren’Py entries and both routes of the cover-edited Heungbu work. It uses the static build and installed Chromium by default. Set `KNOL_BROWSER_CHANNEL=chrome` to explicitly test installed Google Chrome. Stop any server on port 3000 before verifying; the static test server does not silently reuse it. Generated SDK/runtime output, restored private media and screenshots remain ignored by Git. This is a local test setup, not a public release approval.

Library and book-design continuity, direct cover editing and validation: [legacy design parity](docs/architecture/library-book-design-parity.md). The ten UI images (room, shelf, plant, two foreground decorations, four rectangular posters and logo) are restored from the fixed legacy checkout; the owner-authorized reuse and exact hashes are recorded in the restoration manifest.

The original/forked manuscripts' project data and audio cues are in [existing-work evidence](docs/architecture/existing-story-enhancement.md). Cover and entry workflow evidence and remaining limitations are in [book-entry verification](docs/architecture/book-entry-and-cover.md).

`story-maker` is a private repository. Use your existing authorized GitHub account to check it out beside Next; no new repository secret or access grant is installed by this task. Public GitHub CI runs source/type/lint/contract checks and the Web-only static compilation (`pnpm --filter @knolstory/web build`), and explicitly excludes the private-media file-by-file test. It does not run the full media-gated `pnpm build` or prove native playback readiness. Full local `pnpm test:coverage` and Chrome/Ren’Py verification require the restored private media and are recorded in the verification documents.

제품 문구와 개발 문서의 기능 이름은 [제품 용어 기준](docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 문서·UI 변경 시 `pnpm docs:check`와 `pnpm test:docs`로 링크와 명확한 이전 이름의 재유입을 확인한다.
