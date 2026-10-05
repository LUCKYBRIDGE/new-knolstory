# ADR 0011 — 레거시 동결, forward-port, 서버 승계

**Status:** Accepted (2026-10-06, 소유자 결정) — 서버 승계 방식은 기본 가정

## 결정

1. **`story-maker`는 baseline `18da4fc` 이후 기능 동결한다.**
   - 허용: 운영 중 치명적 버그·보안·데이터 손실 수정만.
   - 금지: 신규 기능, UI 개편, 스키마 변경.
2. **레거시에서 수정한 내용은 new-knolstory로 forward-port 여부를 판정한다.**
   - 기록 위치: `docs/migration/forward-port-log.md`
   - 각 항목: 레거시 commit/PR, 내용, 판정(`PORT` / `NOT-APPLICABLE` / `SUPERSEDED`), new-knolstory 반영 위치
   - baseline 커밋 자체는 바꾸지 않는다. baseline 이후 수정은 이 로그로만 추적한다.
3. **서버는 기존 `story-maker/server`를 승계(PRESERVE)한다.** *(기본 가정 — 소유자 확인 필요)*
   - 같은 PostgreSQL DB와 migration 이력, `/api/v1` 계약, Kakao OIDC, 교사 승인코드 모델을 유지한다.
   - new-knolstory `server/`로 코드를 옮길 때 기존 migration 파일은 수정하지 않는다.
   - 운영 경로: MacBook 개발 / Mac mini Docker 운영 / Cloudflare Worker → Tunnel (레거시 ADR `knolstory-macmini-docker-runtime-v1` 승계).
   - 서버는 StoryDocument payload를 해석·렌더하지 않는다. 저장 시 스키마 버전만 검증한다.

## 결과

- 새 코드에서 레거시 동작을 확인할 때는 working tree가 아니라 `git show 18da4fc:<path>`로 baseline을 읽는다.
- 레거시 로컬 clone이 여러 개 있으므로(`story-maker`, `story-maker-handoff-*` 등) 브랜치 상태가 아닌 baseline 커밋을 기준으로 한다.
