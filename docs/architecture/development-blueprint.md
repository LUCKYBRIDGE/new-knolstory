# KnolStory Next — 개발 Blueprint v1.4

- 신규 공식 저장소: `LUCKYBRIDGE/new-knolstory`
- 레거시 기준 저장소: `LUCKYBRIDGE/story-maker` @ `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b` (2026-10-05, PR #100)
- 로컬 작업 경로: 두 곳에서 작업한다 ([ADR 0012](../decisions/0012-toolchain-and-monorepo.md)). 문서·스크립트에는 절대 경로를 쓰지 않는다
- 이전 판: [`docs/archive/KnolStory_Next_Project_Development_Blueprint_v1_3.md`](../archive/KnolStory_Next_Project_Development_Blueprint_v1_3.md)

## v1.3 → v1.4 변경 요약

| 영역 | v1.3 | v1.4 |
|---|---|---|
| Ren'Py 위험 확인 | 7~9단계에서 처음 Ren'Py 실행 | M1에서 spike로 앞당김 ([계획](renpy-web-spike-plan.md)) |
| 재생 상태 소유 | 미정 | Web 호스트의 runtime-core가 소유, Ren'Py는 presenter ([ADR 0014](../decisions/0014-renpy-web-host-and-bridge-model.md)) |
| 숏스토리·HTML·Excel | 언급 없음 | 숏스토리 Web 유지(예외), 오프라인 HTML 폐기→공유 링크, Next 형식 Excel/시트 지원 ([ADR 0009](../decisions/0009-product-scope-shortstory-and-exports.md)) |
| 최초 출시 | 언급 없음 | `story.knolquiz.com` 독립 출시 + 기존 작품 파일 가져오기 ([ADR 0010](../decisions/0010-service-cutover-and-local-data-migration.md)) |
| 레거시 운영 | “안정 기준점” | 기능 동결 + forward-port 로그 ([ADR 0011](../decisions/0011-legacy-freeze-and-forward-port.md)) |
| 서버 | 폴더만 존재 | 새 DB로 독립 개발, 기존 구현·정책 재사용 검토 (추천안) |
| 도구 | 미정 | pnpm + Turborepo + Next 정적 + Vitest/Playwright ([ADR 0012](../decisions/0012-toolchain-and-monorepo.md)) |
| 대상 기기·성능 | 미정 | Tier 1/2 + 예산 ([ADR 0013](../decisions/0013-target-devices-and-performance-budget.md)) |
| 접근성 | 원칙만 | canvas 대응 DOM 의미 계층 ([ADR 0015](../decisions/0015-accessible-story-text-layer.md)) |
| 완료 판정 | 단계 목록만 | 마일스톤별 종료 조건 + 최종 완성 정의 |

핵심 원칙(Continuity is not preservation), SSOT(StoryDocument), 금지사항은 v1.3과 같다.

## 최종 구조

```text
KnolStory Web Service (apps/web)
  ├─ 저작 UI · 서재 · 학급/과제/제출 · 공유 · Local-first 저장
  ├─ 숏스토리 Reader/Editor/인쇄 (Web 렌더, ADR 0009 예외)
  └─ Runtime Host
        ├─ runtime-core: StoryDocument → RuntimeScene, Flow, Stage Layout, 재생 상태
        ├─ 접근성 의미 계층 (DOM, ADR 0015)
        ├─ Edit Overlay (RuntimeScene 좌표 사용)
        └─ JS ↔ Ren'Py Bridge v1
              ↓
        Ren'Py Web Runtime (iframe, presenter): Stage · 대사 · 선택지 · 연출 · 오디오
Server (server/): 인증 · 권한 · 학급 · 과제 · 제출 · 게시 · 온라인 보관
```

## 레거시 기능별 분류

| 기능 (baseline) | 분류 | 위치 |
|---|---|---|
| StoryDocument schema v1~v5 + migration, `.knolstory`, `.nolstory` v1 | PRESERVE | `story-domain`, `compatibility` |
| Flow (2~4 선택지, 합류, 종료/연결 대기 구분, 교사 승인 조건) | PRESERVE | `story-domain`, `runtime-core` |
| Stage Composition v1, Stage Layout Contract v1 (알파 실루엣 기준) | PRESERVE 의미 / REBUILD 구현 | `runtime-core`, `asset-registry` |
| 연출 시스템 v2 (`presentation`: effects/look/transition/actors) | PRESERVE 의미 / REBUILD 렌더 | `runtime-core` → Ren'Py |
| Asset Library v2 (ID, taxonomy, metadata, geometry, revisions) | PRESERVE ID / REFINE 탐색 UI | `asset-registry`, `apps/web` |
| 서재·메인·책 Focus Stage | REFINE | `apps/web` |
| 이야기 구성 / 대본컷쓰기 Workspace | REFINE (Workspace v1.1 참고안 기준) | `apps/web` |
| StoryPlayer / StoryStage / Preview (DOM) | REBUILD → Ren'Py | `renpy/` |
| 읽기 연속성 (경로·이어읽기·표지/종료) | PRESERVE | `runtime-core`, `apps/web` |
| 숏스토리 (Reader/Editor/.shortstory/A4 인쇄) | PRESERVE (Web) | `apps/web` |
| 놀스토리·숏스토리 오프라인 HTML 내보내기 | RETIRE → 공유 링크 | — |
| Excel / 공개 Google 시트 읽기 (Next 형식 기준, 구형 탭 구조 고정 없음) | REFINE | `compatibility` |
| 로컬 저장 (기기당 2개, 체크포인트, 되돌리기, 자동 저장) | PRESERVE 의미 / REFINE | `apps/web` |
| 서버 (PostgreSQL, Kakao OIDC, 교사 승인코드, Outbox, 관리자 분리) | 재사용 후보 / REFINE (추천안). 새 DB·Next 계약으로 독립 개발 | `server/` |
| 대표 작품 (선녀, 흥부, 옹고집, 별주부) | PRESERVE (fixture + 기본 콘텐츠) | `assets/`, `tests/fixtures` |

## 마일스톤

각 마일스톤은 **종료 조건을 만족해야 완료**다. M1의 두 트랙은 병행한다.

### M0 — 기반 문서
- 종료: ADR 0001~0015, DESIGN.md, Blueprint v1.4, STATUS의 정책 질문 정리.
- 2026-10-06 확인: Excel/시트는 Next 형식으로 지원, Chrome 우선·Safari 제외, 최종 도메인 `story.knolquiz.com`. 레거시 정식 서비스가 없었으므로 독립 개발·최초 출시로 진행한다. 서버 재사용 검토는 M1을 막지 않는다.

### M1 — 골격과 위험 확인 (병행)
- **M1a 모노레포**: pnpm/Turborepo, Next 정적 앱 빈 화면, 패키지 골격, CI(typecheck/lint/unit), 의존 방향 검사
- **M1b Ren'Py spike**: [spike 계획](renpy-web-spike-plan.md) S1~S12. 고정 논리 Stage + responsive editor shell + viewportGeneration bridge를 검증한다
- 종료: CI green, spike 결과 문서, ADR 0013·0014 확정

### M2 — 도메인과 호환
- StoryDocument v1~v5 타입·검증·migration 이식, `.knolstory`/`.nolstory` 읽기·쓰기
- 대표 fixture: 4개 기본 작품 + 경계 사례(분기 없음, 2~3 선택지 합류, 중첩 분기, 연결 대기, 4인 무대, 연출 v1→v2 변환)
- 종료: 레거시 baseline에서 내보낸 파일 왕복 시 의미 손실 0 (compatibility matrix 항목별 테스트)

### M3 — 디자인 토큰과 런타임 계약
- `design-tokens`: CSS 변수 + Ren'Py 스타일 상수 동시 생성
- `runtime-contract`: RuntimeScene v1 / Command / Event 스키마 (TS + JSON Schema)
- 종료: fixture → RuntimeScene golden snapshot, 양쪽 스키마 검증 테스트

### M4 — Runtime Core
- Flow 진행, 재생 상태, Stage Layout(레거시 `story-stage-layout` 의미 이식), 자산 해석, presentation 해석
- 종료: **레이아웃 수치 동등성** — 같은 fixture 컷에 대해 레거시 레이아웃 함수와 runtime-core 결과의 인물 rect 차이가 허용 오차 이내

### M5 — Ren'Py Runtime과 Bridge
- 영속 iframe 런타임, 제품 스킨, Bridge v1, 단일 컷 렌더, 접근성 의미 계층
- 종료: 흥부와 놀부 전체 경로를 Ren'Py로 끝까지 플레이 (선택·합류·엔딩·이어읽기 포함), 성능 예산 내

### M6 — 편집 Workspace
- Story Workspace(컷 목록 | Stage + Edit Overlay | Inspector), 장·분기 Context Stack, 선택지 연결 편집, 자산 선택
- 좁은 화면 편집 모드 (ADR 0013 Tier 2)
- 종료: Workspace 참고안 v1.1의 최소 확인 범위(분기 없음, 2~3 선택지 합류, 중첩 분기, 연결 대기에서 새 장 만들기, PC/모바일 넘침) 통과

### M7 — 연출·오디오 완성
- 연출 v2 전체(전환·분위기·균열·환영·시점 전환), 표지·커튼, BGM/SE
- 종료: 4개 기본 작품의 연출 구간이 의미상 동등 (아래 “시각 동등성” 기준)

### M8 — 주변 기능
- 숏스토리(Web), Next 형식 Excel/시트 어댑터, 로컬 저장 체계, 서버 연동(계정·학급·과제·제출·게시·공유 링크)
- 종료: 레거시 기능별 분류표의 PRESERVE 항목 전부 동작

### M9 — 최초 출시
- 작품 파일 가져오기·저장 검증 (ADR 0010), release gate, `story.knolquiz.com` 배포, Next 백업·복원 검증
- 종료: 새 서비스 도메인 배포 완료, 레거시 Web 렌더러 코드가 new-knolstory에 없음. 기존 DB 이전·로컬 자동 이전은 필요해질 때 별도 범위로 진행

## 시각 동등성(Visual parity) 정의

픽셀 일치가 아니라 **의미 동등성**이다.

1. **자동**: 레이아웃 수치 비교 (M4), RuntimeScene golden snapshot, Ren'Py 스크린샷 회귀(새 기준 대비)
2. **반자동**: 4개 기본 작품의 대표 컷(작품당 10~15컷)을 레거시 스크린샷과 나란히 놓은 비교표. 확인 항목: 등장 인물·위치 관계·화자 강조·표정·배경·대사·연출 의도
3. 차이가 의도된 개선이면 DESIGN.md 분류(REFINE/REBUILD) 근거와 함께 기록한다

## 완성 정의 (KnolStory Next 1.0)

- 레거시 baseline의 작품 파일을 의미 손실 없이 가져와 재생한다. 기존 로컬 작품은 파일로 이전하며 자동 저장소 이전은 필수 조건이 아니다
- Editor Stage = Preview = Player = 제출 뷰어 = 공유 링크 = Ren'Py Web Runtime
- 놀스토리 장·컷 작품을 위한 Web 렌더러가 존재하지 않는다 (숏스토리 예외만 존재)
- Tier 1 기기에서 편집·플레이, Tier 2 기기에서 플레이·핵심 편집이 성능 예산 안에서 동작한다
- 키보드·스크린리더로 이야기를 읽고 선택할 수 있다
- `story.knolquiz.com`에 새 서비스가 출시됐고, Next 백업·복원 절차가 검증됐다

## 금지사항

v1.3 금지사항을 그대로 유지하고 다음을 추가한다.

- Ren'Py에 StoryDocument를 전달하지 않음
- 성능·제약 문제를 별도 Web Stage 렌더러로 우회하지 않음
- 레거시 로컬 저장소 원본을 삭제·수정하지 않음
- 문서·스크립트에 로컬 절대 경로를 쓰지 않음
- `story-maker`에 신규 기능을 추가하지 않음

## 2026-10-07 구도·연출·오디오 확장

고정16:9 M1b probe 이후, 사용자 요청에 따라 실제 이야기 표시 영역과 대표 구도 미리보기를 Runtime Core/동일 Ren’Py 인스턴스에 연결했다. 오디오 ID·장 기본/컷 지시·사용자 파일 첨부·인물 motion을 추가했다. 해당 목표의 계약·호환·검증 범위는 [반응형 오디오 제작](responsive-audio-authoring.md)에 기록한다. 학교 Android 실기기와 M1 성능/운영 전체 완료를 의미하지 않는다.
