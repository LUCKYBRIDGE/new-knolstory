# ADR 0012 — 개발 도구와 모노레포

**Status:** Accepted (2026-10-06, 소유자 결정)

## 결정

| 영역 | 선택 |
|---|---|
| 런타임 | Node.js `>=22.13.0` (레거시와 동일), `.nvmrc` / `.node-version` 고정 |
| 패키지 관리 | pnpm workspaces, 루트 `package.json`의 `packageManager`로 버전 고정 |
| 빌드 오케스트레이션 | Turborepo |
| 언어 | TypeScript strict, 패키지 간 공개 API는 각 패키지 `src/index.ts`로만 노출 |
| Web 앱 | Next.js 정적 export → Cloudflare Pages (레거시 배포 경로 승계) |
| 단위 테스트 | Vitest |
| 브라우저/시각 테스트 | Playwright (Ren'Py canvas 포함 스크린샷·레이아웃 검증) |
| Ren'Py | SDK 버전을 `renpy/RENPY_VERSION`에 고정. 업그레이드는 별도 PR + runtime QA |
| CI | GitHub Actions: typecheck, lint, unit, contract, Ren'Py Web build, browser smoke |

## 패키지 의존 방향

| 패키지 | 의존 가능 대상 |
|---|---|
| `story-domain` | (없음) |
| `runtime-contract` | (없음) |
| `design-tokens` | (없음) |
| `asset-registry` | (없음) |
| `compatibility` | `story-domain` |
| `runtime-core` | `story-domain`, `runtime-contract`, `asset-registry` |
| `ui` | `design-tokens` |
| `apps/web` | 위 전부 |
| `server` | `story-domain` (스키마 버전 검증용), `compatibility` (payload v1 읽기) |
| `renpy/` | `runtime-contract`에서 생성한 JSON Schema만 |

- 역방향·순환 의존은 CI에서 차단한다.
- `renpy/`는 `runtime-contract`의 스키마(생성된 JSON Schema)만 안다. StoryDocument 타입을 import하지 않는다.
- `design-tokens`는 CSS 변수와 Ren'Py 스타일 상수(`renpy/game/tokens.rpy` 생성물)를 **같은 원천에서 생성**한다.

## 로컬 경로

작업 경로는 `/Users/wan/ai_dev/apps/new-knolstory`(주)와 `/Volumes/WAN2/apps/new-knolstory`(보조) 둘 다 쓸 수 있다.
따라서 **문서·스크립트·설정에 절대 경로를 쓰지 않는다.** 모든 경로는 저장소 루트 기준 상대 경로다.
