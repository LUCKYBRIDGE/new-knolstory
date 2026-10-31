# 이 저장소의 테스트 seam

각 seam이 잡는 것과 놓치는 것. 실행 명령은 `package.json`과 `playwright.config.ts`가 원본이다. 테스트 층의 기준과 실제 확인 범위는 영역 절차 `runtime-qa`(`.agents/skills/runtime-qa/SKILL.md`)가 소유한다.

| seam | 위치 | 잡는 것 | 놓치는 것 | 실행 |
|---|---|---|---|---|
| 작품 해석(Runtime Core) | `packages/runtime-core` 공개 export | Flow·조건·점수·배치 계산, RuntimeScene 생성 | 실제 Ren'Py 그리기, 화면 조작 | `pnpm exec vitest run packages/runtime-core/...` |
| 작품 파일·양식(compatibility) | `packages/compatibility` 공개 export | 보관 형식 검증, 표 양식 왕복, 필드 보존 | 실제 Excel·Google 앱의 저장 | `pnpm exec vitest run packages/compatibility/...`, 외부 앱은 `pnpm test:office-roundtrip` |
| 실행 계약(runtime-contract) | `packages/runtime-contract` 타입·guard | 잘못된 payload 거부, 버전·순번 | bridge의 실제 메시지 순서 | `pnpm exec vitest run packages/runtime-contract/...` |
| Web 로직 | `apps/web/lib/*.ts` 공개 함수 | 편집 연산, 저장소 처리, 문구 규칙 | 컴포넌트 배치, 포커스, 한글 조합 | `pnpm exec vitest run apps/web/lib/<파일>.test.ts` |
| Web 화면(host E2E) | Playwright `host` 프로젝트 | 실제 클릭·입력·파일·복귀 경로 | Ren'Py 내부 렌더 결과 | `pnpm test:e2e`, 단일: `pnpm exec playwright test --project=host <spec>` |
| 실제 Ren'Py | `stories-runtime`, `runtime-*` 프로젝트 | 장면·대사·선택지·소리의 실제 재생 | 실기기 성능, 보조 기술 | `pnpm test:e2e:stories`, `pnpm test:e2e:runtime` (먼저 `pnpm runtime:build` 다음 `pnpm build`) |
| 정적 배포 후보 | `tests/static-delivery.playwright.config.ts` | API 없는 첫 접속, 같은 출처 실행, 파일 왕복 | 실제 CDN 캐시, 느린 망 | `pnpm test:e2e:static` |
| 서버 API | `server/` 통합 테스트 | 권한·동시성·멱등성·DB | 실제 운영 도메인, OAuth 제공자 | `pnpm --dir server test:integration` |
| 스크립트 | `scripts/tests` | 배포·자산·런타임 준비 스크립트 | 실제 원격 응답 | `pnpm test:scripts` |

주의:
- Playwright 프로젝트는 spec 파일 목록을 직접 나열한다. 새 E2E spec을 만들면 `playwright.config.ts`의 해당 프로젝트 `testMatch`에 넣어야 실행된다.
- 정적 결과로 E2E를 돌릴 때는 `KNOL_TEST_STATIC=1`. 실행 중인 dev 서버를 재사용할 수 있다.
- 단위 테스트 green은 실제 Ren'Py·외부 앱·실기기 근거가 아니다.
