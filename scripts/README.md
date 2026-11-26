# scripts

Repository automation for asset processing, contract generation, build orchestration, migration checks and test utilities.

Scripts must respect the ownership boundaries defined in AGENTS.md.

## Authorized local test environment

- `pnpm env:prepare --legacy ../story-maker`: restore exact baseline media, frozen dependency install, verified runtime inputs, Chromium and shared native/static builds.
- `pnpm env:doctor`: versions, source media hashes, source/static runtime agreement and browser launch.
- `pnpm env:verify`: script/unit/contract/media gates and existing book/cover/portable-file/native-reading journeys on the static build.
- `pnpm preview`: loopback static export server; no public deployment.
- `pnpm runtime:prepare [--reinstall]`: verified pinned SDK/Web/font installation and reuse.
- `scripts/dev-worktree.sh <name>`: new worktree under `KNOL_DEV_ROOT` with copied ignored media and installed dependencies ([dev disk skill](../.agents/skills/dev-disk/SKILL.md)).
- `pnpm test:scripts`: no-network tests for archive safety, cache verification, generated-state handling and environment checks.

See [setup, recovery and transfer](../docs/architecture/reproducible-test-environment.md).
