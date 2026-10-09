# ADR 0011 — 레거시 동결, forward-port, 독립 서버 개발

**Status:** Accepted (레거시 동결) / Proposed (서버 재사용 세부안)

## 결정

1. **`story-maker`는 baseline `18da4fc` 이후 기능 동결한다.**
   - 허용: 운영 중 치명적 버그·보안·데이터 손실 수정만.
   - 금지: 신규 기능, UI 개편, 스키마 변경.
2. **레거시에서 수정한 내용은 new-knolstory로 forward-port 여부를 판정한다.**
   - 기록 위치: `docs/migration/forward-port-log.md`
   - 각 항목: 레거시 commit/PR, 내용, 판정(`PORT` / `NOT-APPLICABLE` / `SUPERSEDED`), new-knolstory 반영 위치
   - baseline 커밋 자체는 바꾸지 않는다. baseline 이후 수정은 이 로그로만 추적한다.
3. **Next 서버는 독립 개발하며 기존 서버 구현을 재사용 후보로 삼는다.**
   - 소유자는 레거시가 학생·교사에게 정식 서비스된 상태가 아니라고 확인했다. 같은 DB·계정·API 계약의 강제 승계는 요구하지 않는다.
   - Node.js + PostgreSQL, 인증·학급·과제·제출 정책은 아래 추천안을 기준으로 검토한다. 필요한 스키마와 API는 Next 도메인에 맞춰 정리할 수 있다.
   - 새 전용 개발·테스트 DB를 사용한다. 기존 DB와 migration 원본은 변경하지 않으며, 가져올 코드·migration은 검토와 회귀 검증 후 선택한다.
   - 서버는 입력 구조·용량·소유권을 검증하고 저장·권한을 담당한다. Flow·Stage·연출 해석과 렌더링은 맡지 않는다.

## 결과

- 새 코드에서 레거시 동작을 확인할 때는 working tree가 아니라 `git show 18da4fc:<path>`로 baseline을 읽는다.
- 레거시 로컬 clone이 여러 개 있으므로(`story-maker`, `story-maker-handoff-*` 등) 브랜치 상태가 아닌 baseline 커밋을 기준으로 한다.

## 2026-10-06 서버 검토 추천안 (소유자 확정 전)

- 기술 기반은 Node.js + PostgreSQL을 유지하고, 인증·권한·학급·과제·불변 제출·저장 충돌/중복 요청 처리 정책을 재사용한다. 새 구조에 맞춘 분류는 PRESERVE 정책 / REFINE 구현이다.
- baseline `server/src/documents.ts`는 `app/story-project-document`, `app/shortstory/*`, `app/story-file`, `app/story-project-collection`을 직접 참조한다. 새 서버는 Web 앱을 참조하지 않고 `story-domain` / `compatibility`의 검증·payload 어댑터를 사용한다. 스키마 버전뿐 아니라 입력 구조·용량·소유권도 검증하며, 작품의 실행·연출 해석은 하지 않는다.
- 새 저장 API/payload는 도메인 확정 후 버전과 migration을 명시한다. 기존 payload v1 어댑터는 실제 가져올 자료가 있을 때 추가한다. 기존 `/api/v1`이나 payload 구조를 그대로 유지할 의무는 없다.
- 새 전용 DB로 개발·테스트와 최초 출시를 준비한다. 기존 DB·계정 이전은 필수 조건이 아니며, 필요 시 별도 복원본에서 검증한다. 기존 DB를 개발 작업에 직접 연결하지 않는다.
- 기존 Cloudflare Pages + Worker `/api/v1` + Tunnel + Docker API/PostgreSQL 경로를 초기 운영 후보로 유지한다. Mac mini의 가용성·백업 복원·재시작을 전환 전에 검증하며, 호스팅 변경이 필요해도 도메인·API·데이터 계약은 유지한다.
- M1~M5의 로컬 편집·재생 개발은 서버 연결 없이 진행할 수 있다. 서버 계정·학급·제출 통합은 M8에서 수행하며 필요한 payload/권한 계약과 승계 검토는 앞서 준비한다.
