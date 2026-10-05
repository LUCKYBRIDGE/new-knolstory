# STATUS.md

## Repository
- Successor: `LUCKYBRIDGE/new-knolstory`
- Legacy: `LUCKYBRIDGE/story-maker` (feature-frozen, ADR 0011)
- Legacy baseline: `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`
- Blueprint: [`docs/architecture/development-blueprint.md`](docs/architecture/development-blueprint.md) (v1.4)

## Phase
**M0 — 기반 문서.** 제품 코드는 아직 없다.

## Completed
- Successor repository created; legacy baseline fixed.
- Web + Runtime Core + Ren'Py Web target architecture defined (ADR 0001–0008).
- 2026-10-06 gap review: ADR 0009–0015, Blueprint v1.4, DESIGN.md device/overlay/accessibility rules, compatibility matrix expansion, Ren'Py spike plan, forward-port log.

## Owner decisions (2026-10-06)
- Ren'Py Web 단일 렌더러: **무조건 확정** (spike는 방식 확인용, go/no-go 아님)
- 숏스토리: 포함, Web 렌더 + 인쇄 유지 (Ren'Py 대상 아님)
- 오프라인 HTML 내보내기: 폐기 → 온라인 공유 링크
- 운영 전환: 같은 도메인 교체 + 로컬 작품 자동 마이그레이션 + `.knolstory` 백업 안내
- 레거시: 기능 동결, 치명적 수정만, forward-port
- 대상 기기: 학교 Windows PC, 크롬북, 안드로이드 태블릿 (편집 주 환경) / 스마트폰 (플레이 + 편집 가능)
- 도구: pnpm + Turborepo + Next.js 정적 + Vitest/Playwright, Node 22
- 로컬 경로: 주/보조 두 작업 경로 사용 (ADR 0012에 기록)

## Open questions (소유자 확인 필요)
1. **Excel/Google 시트 호환 승계** — ADR 0009에서 승계로 가정. 유지 맞는지?
2. **서버 승계 방식** — 레거시 `server/`와 같은 PostgreSQL DB·`/api/v1`·Kakao OIDC를 그대로 승계로 가정 (ADR 0011). 맞는지?
3. **iPhone(Safari) 지원 수준** — 현재 best-effort. 학생 스마트폰에 iPhone 비중이 크면 Tier 2로 올려야 함.
4. **현재 운영 origin** — 학생이 실제 쓰는 주소(`story.knolquiz.com` / `*.pages.dev`)가 무엇인지. 자동 마이그레이션 가능 범위가 여기에 달려 있음 (ADR 0010).

## Active task
M0 마무리: 위 열린 질문 확인 → ADR 상태 갱신.

## Next
1. **M1a** 모노레포 골격 + CI (ADR 0012)
2. **M1b** Ren'Py Web spike S1–S10 (병행, `docs/architecture/renpy-web-spike-plan.md`)
3. **M2** StoryDocument v1–v5 이식 + 대표 fixture (선녀, 흥부, 옹고집, 별주부 + 경계 사례)

## Guardrail
Do not begin by copying the current Web Player or converting stories to `.rpy`.
