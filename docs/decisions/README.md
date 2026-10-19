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
| [0009](0009-product-scope-shortstory-and-exports.md) | 제품 범위: 숏스토리(Web 예외)·오프라인 HTML 폐기·Next 형식 Excel/시트 지원 | Accepted |
| [0010](0010-service-cutover-and-local-data-migration.md) | 새 서비스 최초 출시 + 기존 작품 파일 가져오기 | Accepted |
| [0011](0011-legacy-freeze-and-forward-port.md) | 레거시 기능 동결, forward-port 로그, 독립 서버 개발·재사용 검토 | Accepted (동결) / Proposed (서버 세부안) |
| [0012](0012-toolchain-and-monorepo.md) | pnpm + Turborepo + Next 정적 + Vitest/Playwright, 의존 방향 | Accepted |
| [0013](0013-target-devices-and-performance-budget.md) | 대상 기기 등급과 성능 예산 | Accepted / 수치 Provisional |
| [0014](0014-renpy-web-host-and-bridge-model.md) | Ren'Py Web 호스팅·재생 상태 소유·Bridge v1 | Proposed (spike 후 확정) |
| [0015](0015-accessible-story-text-layer.md) | canvas 대응 접근성 DOM 의미 계층 | Accepted |

Expand 0001–0008 into fuller ADR files as implementation decisions gain concrete schemas and tradeoffs.

## 현재 부분 대체 및 후속 결정

- [0016 — 현재 저작 형식과 호환 범위](0016-authoring-format-contract-and-scope.md): 현재 목표의 Next-only 파일 보호, archive/workbook v2와 ADR0009/0010의 legacy import gate 부분 대체.
- ADR0014의 소유 규칙/현재 구현과 미확정 측정·운영 범위는 문서 상단에서 구분한다.
- 새 결정은 이전 기록을 지우지 않고 적용 범위·날짜·대체 문서를 명시한다. [변경 관리](../architecture/documentation-governance.md).

- [0017 — 작품 점수와 누적 선택 저작](0017-story-score-authoring.md): StoryDocument6/workbook3, Core의 기록 재계산, 한글 저작과 서버 정책의 분리.

- [0018 — 초 단위 편집과 용어 통일](0018-authoring-seconds-and-terminology.md): workbook4의 초, 문서 내부ms 보존, 용어 안내와 이전 양식 변환.

- [0019 — 소리 검색 속성과 출처](0019-audio-search-attributes-and-sources.md): 선택적 AudioMetadata, workbook5, 작품별 보존, Pixabay의 한글 원음 목록과 조건.

- [0020 — 공용 편집 음원 권리](0020-common-audio-service-rights.md): 공용 제공 승인47개, Pixabay14개 제외, 기존 ID 보존·교체 안내와 원본/ZIP 빌드 검증. ADR0019의 당시 제공 상태를 부분 대체.

- [0021 — 장면용 사용과 독립 재배포 분리](0021-scene-integrated-audio-rights.md): 사용자 수정에 따라 CC047개/Pixabay 장면용14개, 내부 승인version2, 장면에서 듣기·원음 다운로드 UI 제외·작품 참조 내보내기. ADR0020의 일괄 제외를 부분 대체.

- [0022 — 실제 선택 기록의 연출·소리 조건](0022-branch-conditioned-direction.md): 문서8/양식8, 정확한 선택 ID·Core 해석과 기존 snapshot 보호.

- [0023 — Mac mini Docker와 카카오 가입·Google 연결 로그인](0023-mac-mini-docker-and-linked-login.md): 현재 사용자 결정. 기존 서비스 격리, 내부 계정 유지와 명시적 연결; 학급/공유/보관은 별도.

- [0024: Personal document API ownership and concurrency](0024-private-document-api.md)

- [0025 — 구 서버 교체와 신규 Next 운영 환경](0025-legacy-server-replacement.md): 장기 병행 운영을 폐기하고 Next로 교체. 구 데이터 영구 삭제 방향은 확정했으며 정확한 대상의 최종 확정 후 실행. 공유 SSH/Tunnel과 Next 저작 데이터는 보호.
