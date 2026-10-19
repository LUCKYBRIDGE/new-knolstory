# Runtime QA Skill

1. Read [reproducible environment](../../../docs/architecture/reproducible-test-environment.md), `package.json` and `playwright.config.ts`; use current scripts/test selections rather than historical counts.
2. Prepare runtime/assets if needed; build runtime then Web sequentially. Verify the served static app and runtime come from the intended build. `env:doctor` checks presence/integrity, not functional playback.
3. Run affected unit/contract checks and host E2E; use `KNOL_TEST_STATIC=1` for static E2E. Actual Ren'Py paths use `pnpm test:e2e:stories` and DPR projects via `pnpm test:e2e:runtime`; host/probe success alone is not native rendering evidence.
4. Verify editor/player parity, persistent iframe across resize/fullscreen, resets/replay, acknowledgement/overlay alignment, choices/endings/resume and keyboard/touch.
5. For presentation/audio test unlock, confirmation completion, long text, reduced motion, entry deduplication, channels and revision changes. For changed authoring formats test actual external save/export→import→reload→native playback; ShortStory uses Web/CSS print.
6. Record commands, versions/build, inputs, passed/failed/skipped, screenshots and limits. Preserve initial failures and link corrective reruns; do not claim a single green full suite from combined partial results.
7. Viewport/DPR emulation is not physical school hardware, measured performance or screenreader validation. These remain explicit follow-ups until directly verified.

Use [documentation governance](../../../docs/architecture/documentation-governance.md) when checks/requirements change. Old completion records do not verify later edits.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
