# ADR 0010 — 최초 서비스 출시와 기존 로컬 작품 가져오기

**Status:** Accepted (2026-10-06, 소유자 추가 확인 반영)

## 배경

소유자는 레거시 놀스토리가 학생·교사에게 정식 서비스된 상태가 아니라고 확인했다. Next는 기존 운영 사용자·계정·DB의 무중단 승계를 전제로 하지 않고 독립적으로 개발·출시한다. 레거시 개발·시험 작품은 브라우저 저장소(IndexedDB `nolstory-workspace-v1`, `storygame*` localStorage 키 등)에 있을 수 있다.
브라우저 저장소는 **origin(도메인) 단위로 격리**되므로, 주소가 바뀌면 새 앱은 기존 작품을 읽을 수 없다.

## 결정

1. **최종 서비스 도메인은 `https://story.knolquiz.com`이다.** 새 서비스의 최초 출시로 계획하며, 현재 학생 운영 도메인 확인을 개발 착수 조건으로 두지 않는다.
2. **기존 작품 파일 가져오기를 기본 이전 경로로 삼는다.** 최초 출시의 필수 조건으로 레거시 저장소 자동 마이그레이션을 요구하지 않는다. 자동 이전이 실제로 필요해져 구현하는 경우 다음 규칙을 따른다.
   - `packages/compatibility`가 레거시 저장소를 읽어 StoryDocument 최신 스키마로 migration한 뒤 새 저장소에 기록한다.
   - **레거시 원본은 삭제·수정하지 않는다** (레거시 Local-first 경계 v1 2항 승계). 롤백 시 레거시 빌드가 그대로 원본을 읽을 수 있어야 한다.
   - 마이그레이션은 멱등이다. 완료 표식은 새 namespace에만 기록한다.
   - 개별 작품 실패는 전체 실패로 만들지 않는다. 실패 작품은 원본을 보존하고 `.knolstory` 내보내기를 제공한다.
3. **기존 작품을 가져온 뒤 `.knolstory` 백업 다운로드를 안내한다.** (강제 차단 아님)
4. **새 앱의 저장소 namespace는 `knolstory-*`를 사용한다.** 레거시 키는 읽기 전용 호환 예외다.
5. **origin이 다른 레거시 주소의 데이터는 자동 이전 대상이 아니다.** 예: `*.pages.dev`. 해당 사용자는 레거시 앱의 파일 내보내기 → 새 앱 불러오기 경로를 사용한다. 레거시 앱에 이 경로가 남아 있어야 한다.
6. **기존 서버 DB·계정·온라인 보관본의 이전은 최초 출시의 필수 조건이 아니다.** 실제 보존할 자료가 확인되면 별도 import 계획을 수립한다. 기존 저장소나 DB를 삭제하는 작업은 이 결정의 범위가 아니다.

## 출시 조건

- 대표 작품 파일 가져오기 → 편집 → 저장 → 재실행 및 원본 파일 보존 확인
- Next 배포와 백업·복원 절차 검증. 레거시 앱으로 되돌리는 리허설은 필수 조건이 아니다.
- 자동 로컬 이전을 추가하는 경우에만 레거시 저장소 fixture, 멱등성, 실패 격리와 원본 보존을 추가 검증

## 열린 항목

- 기존 개발·시험 데이터가 필요하면 해당 origin을 확인하고 파일로 가져온다. origin 전수 조사는 최초 출시의 필수 작업이 아니다.
- 레거시 저장소 키: baseline 문자열 리터럴 기준으로 아래를 확인했다. 동적으로 조합되는 키(프로젝트별 suffix 등)는 M9 전에 코드 수준에서 추가 확인한다.
  - IndexedDB: `nolstory-workspace-v1` (변경 이벤트 `nolstory:workspace-change`)
  - localStorage/sessionStorage: `storygame:active:v1`, `storygame:projects:v1`, `storygame:draft:v1`, `storygame:backup:v1`, `storygame:checkpoints:v1`, `storygame:reading-path:v1`, `storygame:reading-progress:v1`, `storygame:navigation:v1`, `storygame:book-phase:v1`, `storygame:book-finished:v1`, `storygame:library-view:v1`, `storygame:landing-visit:v1`, `storygame:display-settings:v1`, `storygame:asset-favorites:v1`, `storygame:asset-recents:v1`, `storygame:revision-responses:v1`, `storygame:ui-session:v1`, `storygame:teacher_passcode_unlocked`
  - 숏스토리 저장소: `app/shortstory/shortstory-v2-repository.ts` 기준
