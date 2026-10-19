# Release Gate Skill

Before production release:

1. Read [STATUS](../../../STATUS.md), current release/QA follow-ups and [documentation governance](../../../docs/architecture/documentation-governance.md). A completed authoring-format goal is not product 1.0 or deployment completion.
2. Require evidence for supported Next archives/adapters and whole-document fixtures; include actual Excel/Google exports if affected. Old story-maker support is a separately scoped decision.
3. Require current runtime contract checks, sequential runtime/Web build, affected host/native/DPR tests, visual/user-path checks and local save/recovery/reopen behavior.
4. Verify implemented account/permission/class/assignment/submission/share paths when released. Do not satisfy those gates with proposed contracts or pure JSONB serialization.
5. Check real target-device performance/accessibility, media rights, secrets/config, backup/restore and actual deployed state for the release scope.
6. Report failures/skips/unsupported scope explicitly; preserve historical evidence. Get required authorization for publish/push/credential/third-party changes.

A good-looking story, local build or historical passing count alone is not release evidence.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
