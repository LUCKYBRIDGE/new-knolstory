# ADR 0009 — 제품 범위: 숏스토리·내보내기·스프레드시트

**Status:** Accepted (2026-10-06, 소유자 결정)

## 배경

Blueprint v1.3은 Ren'Py 단일 렌더러를 정의했지만, 레거시 baseline(`18da4fc`)에 이미 출시된 다음 기능의 처리 방침이 없었다.

- 숏스토리 Reader/Editor, `.shortstory`, 4탭 Excel, A4 소책자 인쇄
- 놀스토리·숏스토리 읽기 전용 단일 HTML 내보내기
- 놀스토리 8탭 Excel 왕복, 공개 Google 시트 일회성 읽기

## 결정

1. **숏스토리는 new-knolstory 범위에 포함한다. 단, Ren'Py 대상이 아니다.**
   - 숏스토리는 그림책·인쇄 매체이므로 Web(DOM/CSS) 렌더링과 인쇄 CSS를 유지한다.
   - 이는 ADR 0002 “영구적 두 번째 Web Player 금지”의 **명시적 예외**다. 예외 범위는 숏스토리 페이지 렌더와 인쇄로 한정하며, 놀스토리 장·컷·분기 작품을 숏스토리 렌더러로 재생하지 않는다.
   - 숏스토리 렌더러는 `apps/web` 내부 모듈로 두고 `packages/runtime-core`에 의존하지 않는다.
2. **오프라인 단일 HTML 내보내기는 폐기(RETIRE)한다.**
   - 대체 수단은 Ren'Py Web 플레이어를 사용하는 **온라인 공유 링크**다.
   - 기존에 배포된 HTML 파일은 그대로 열리지만, new-knolstory는 새로 만들지 않는다.
   - 오프라인 보관·이동 수단은 `.knolstory` / `.shortstory` 파일이다.
3. **Excel/Google 시트 호환은 승계(PRESERVE)한다.** *(기본 가정 — 소유자 확인 필요, STATUS 열린 질문 참조)*
   - 8탭 놀스토리 Excel, 4탭 숏스토리 Excel, 공개 시트 읽기는 `packages/compatibility`의 import/export 어댑터로 이전한다.
   - Excel 구조는 StoryDocument의 투영(projection)일 뿐 SSOT가 아니다.

## 결과

- 공유 링크는 서버(공개/게시 정책)와 Ren'Py Web 플레이어가 준비돼야 하므로, 오프라인 HTML 폐기 시점은 공유 링크 출시 이후로 한다.
- 레거시 숏스토리 HTML 내보내기도 같은 정책을 따른다. 숏스토리 공유가 필요하면 Web 숏스토리 Reader 공유 링크로 제공한다.
