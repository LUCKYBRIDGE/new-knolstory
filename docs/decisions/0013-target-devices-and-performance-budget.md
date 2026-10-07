# ADR 0013 — 대상 기기와 성능 예산

**Status:** Accepted (기기 등급) / Provisional (수치 예산 — Ren'Py Web spike 측정 후 확정)

## 기기 등급

| 등급 | 환경 | 요구 |
|---|---|---|
| **Tier 1 — 편집 주 환경** | 학교 Windows PC (Chrome), 크롬북, 안드로이드 태블릿 (Chrome) | 편집·플레이 전 기능. Release gate 필수 |
| **Tier 2 — 읽기/플레이 + 핵심 편집** | 스마트폰 (안드로이드 Chrome) | 읽기·플레이 전 기능. 편집은 좁은 화면 모드에서 핵심 작업(글·화자·배경/인물 선택·선택지·컷 추가/이동) 가능. 전체 흐름 지도·대량 자산 작업은 단순화 허용 |
| **현 단계 범위 밖** | Safari / iPad·iPhone | 지원 구현·QA·Release gate에서 제외 (2026-10-06, 소유자 결정) |

지원 브라우저는 우선 Chrome이다. Edge 등 다른 브라우저의 별도 검증은 현 단계 필수 범위가 아니다. iPhone의 Chrome도 현 단계 기기 지원 범위에 포함하지 않는다.

편집의 최적 환경은 태블릿 이상이다. 스마트폰 편집은 “가능해야 한다”이며 “동일 경험”을 요구하지 않는다.

## Viewport 예산

KnolStory Stage는 반응형 편집 Shell 안에서 고정 논리 비율로 표시한다. 초기 probe 기준은 `1280×720` 16:9이며, 좁은 화면에서는 Stage 자체를 줄이고 active editor를 별도 Web panel로 제공한다.

| 항목 | 목표 | 측정 기준 |
|---|---|---|
| Overlay ↔ Ren'Py content rect 정렬 오차 | `<= 2 CSS px` | DPR 1/1.5/2, desktop/tablet/phone landscape |
| Resize/orientation 후 overlay 재활성화 | 실제 viewport 동기화 확인 후. generation별 ack는 제품 계약 강화 후보이며 probe 완료 사항이 아님 | 모든 Tier |
| Resize/orientation 중 iframe lifecycle | iframe 재생성 없음 | 모든 Tier |
| 스마트폰 landscape 대사 표시 | 2-3줄 이상 읽기 가능, clipping 없음 | 안드로이드 Chrome |
| 핵심 편집 control hit target | 제품 기준 `44px` 유지 | touch 기기 |

## 성능 예산 (초기 목표치)

| 항목 | 목표 | 측정 기준 기기 |
|---|---|---|
| Ren'Py 런타임 최초 로드 → 첫 컷 표시 | ≤ 6s (cold), ≤ 2s (캐시) | 학교 PC, 안드로이드 태블릿 |
| 편집 입력 → Stage 반영 (텍스트·화자) | p95 ≤ 150ms | Tier 1 |
| 편집 입력 → Stage 반영 (캐시된 자산 교체) | p95 ≤ 300ms | Tier 1 |
| 플레이 중 컷 전환 입력 지연 | p95 ≤ 100ms (연출 시간 제외) | Tier 1·2 |
| 30분 연속 편집 세션 메모리 증가 | 안정화 (지속 증가 없음) | 안드로이드 태블릿 |
| 런타임 기본 다운로드 크기 | spike에서 측정 후 상한 결정 | — |

수치는 Ren'Py Web spike(`docs/architecture/renpy-web-spike-plan.md`) 결과로 확정하고, 확정 후 이 ADR 상태를 Accepted로 바꾼다.
예산을 지키기 어렵다는 이유로 별도 Web 렌더러를 두지 않는다 (ADR 0002). 대신 런타임 구성·자산 전략·UX(예: 좁은 화면에서 Stage 축소 표시)를 조정한다.
