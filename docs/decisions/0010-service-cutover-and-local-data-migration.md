# ADR 0010 — 운영 전환과 로컬 작품 마이그레이션

**Status:** Accepted (2026-10-06, 소유자 결정) — 세부 키 목록은 구현 시 확정

## 배경

놀스토리는 Local-first다. 학생 작품은 브라우저 저장소(IndexedDB `nolstory-workspace-v1`, `storygame*` localStorage 키, 읽기 진행·표시 설정·숏스토리 저장소)에 있다.
브라우저 저장소는 **origin(도메인) 단위로 격리**되므로, 주소가 바뀌면 새 앱은 기존 작품을 읽을 수 없다.

## 결정

1. **같은 운영 도메인에서 레거시 앱을 new-knolstory로 교체한다.** 별도 주소 병행 운영을 기본으로 하지 않는다.
2. **첫 실행 시 자동 마이그레이션한다.**
   - `packages/compatibility`가 레거시 저장소를 읽어 StoryDocument 최신 스키마로 migration한 뒤 새 저장소에 기록한다.
   - **레거시 원본은 삭제·수정하지 않는다** (레거시 Local-first 경계 v1 2항 승계). 롤백 시 레거시 빌드가 그대로 원본을 읽을 수 있어야 한다.
   - 마이그레이션은 멱등이다. 완료 표식은 새 namespace에만 기록한다.
   - 개별 작품 실패는 전체 실패로 만들지 않는다. 실패 작품은 원본을 보존하고 `.knolstory` 내보내기를 제공한다.
3. **마이그레이션 직후 `.knolstory` 백업 다운로드를 안내한다.** (강제 차단 아님)
4. **새 앱의 저장소 namespace는 `knolstory-*`를 사용한다.** 레거시 키는 읽기 전용 호환 예외다.
5. **origin이 다른 레거시 주소의 데이터는 자동 이전 대상이 아니다.** 예: `*.pages.dev`. 해당 사용자는 레거시 앱의 파일 내보내기 → 새 앱 불러오기 경로를 사용한다. 레거시 앱에 이 경로가 남아 있어야 한다.
6. **서버 온라인 보관본**은 레거시 server payload v1을 읽을 수 있어야 한다 (ADR 0011 참조).

## 전환 조건 (Release gate에 추가)

- 레거시 baseline 사용자 저장소 상태를 재현한 fixture로 자동 마이그레이션 테스트 통과
- 대표 기기(ADR 0013 Tier 1)에서 마이그레이션 → 편집 → 재실행 → 롤백(레거시 재배포) 후 원본 보존 확인
- 롤백 절차 문서화: 같은 도메인에 레거시 빌드를 재배포할 수 있는 상태 유지

## 열린 항목

- 현재 학생이 실제로 사용하는 운영 origin 목록 (`story.knolquiz.com`, `story-maker-5b1.pages.dev` 등) 확인
- 레거시 저장소 키: baseline 문자열 리터럴 기준으로 아래를 확인했다. 동적으로 조합되는 키(프로젝트별 suffix 등)는 M9 전에 코드 수준에서 추가 확인한다.
  - IndexedDB: `nolstory-workspace-v1` (변경 이벤트 `nolstory:workspace-change`)
  - localStorage/sessionStorage: `storygame:active:v1`, `storygame:projects:v1`, `storygame:draft:v1`, `storygame:backup:v1`, `storygame:checkpoints:v1`, `storygame:reading-path:v1`, `storygame:reading-progress:v1`, `storygame:navigation:v1`, `storygame:book-phase:v1`, `storygame:book-finished:v1`, `storygame:library-view:v1`, `storygame:landing-visit:v1`, `storygame:display-settings:v1`, `storygame:asset-favorites:v1`, `storygame:asset-recents:v1`, `storygame:revision-responses:v1`, `storygame:ui-session:v1`, `storygame:teacher_passcode_unlocked`
  - 숏스토리 저장소: `app/shortstory/shortstory-v2-repository.ts` 기준
