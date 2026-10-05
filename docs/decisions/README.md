# Architecture Decisions

Accepted foundation decisions:

1. **StoryDocument is SSOT.** `.rpy` is never the student work format.
2. **Ren'Py Web is the official final Story Runtime.**
3. **RuntimeScene is the versioned Web ↔ Runtime execution contract.**
4. **Runtime Core owns canonical Stage Layout.**
5. **Legacy baseline is `LUCKYBRIDGE/story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`.**
6. **Root DESIGN.md is the design/UI/UX SSOT.**
7. **Legacy design continuity matters; pixel replication does not.**
8. **Continuity is not preservation:** improvement is expected when semantics and comprehension are preserved.

Added 2026-10-06 (owner decisions + gap review):

| ADR | 제목 | 상태 |
|---|---|---|
| [0009](0009-product-scope-shortstory-and-exports.md) | 제품 범위: 숏스토리(Web 예외)·오프라인 HTML 폐기·Excel 승계 | Accepted (Excel은 기본 가정) |
| [0010](0010-service-cutover-and-local-data-migration.md) | 같은 도메인 교체 + 로컬 작품 자동 마이그레이션 | Accepted |
| [0011](0011-legacy-freeze-and-forward-port.md) | 레거시 기능 동결, forward-port 로그, 서버 승계 | Accepted (서버는 기본 가정) |
| [0012](0012-toolchain-and-monorepo.md) | pnpm + Turborepo + Next 정적 + Vitest/Playwright, 의존 방향 | Accepted |
| [0013](0013-target-devices-and-performance-budget.md) | 대상 기기 등급과 성능 예산 | Accepted / 수치 Provisional |
| [0014](0014-renpy-web-host-and-bridge-model.md) | Ren'Py Web 호스팅·재생 상태 소유·Bridge v1 | Proposed (spike 후 확정) |
| [0015](0015-accessible-story-text-layer.md) | canvas 대응 접근성 DOM 의미 계층 | Accepted |

Expand 0001–0008 into fuller ADR files as implementation decisions gain concrete schemas and tradeoffs.
