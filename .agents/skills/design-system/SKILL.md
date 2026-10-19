# Design System Skill

Before UI work:

1. Read [DESIGN](../../../DESIGN.md), inspect current components and relevant design evidence; reuse tokens/components.
2. Keep the library a book-selection space with intentional room gaps, minimum two shelf rows and selection-only actions. Keep the editing workspace compact without redundant controls or excessive empty panels.
3. Introduction waits for explicit library entry. Preserve user wording and freely authored cover composition; wrap long Korean titles/body/buttons without overlap or clipping.
4. For authoring sheets follow [current workbook](../../../docs/architecture/authoring-workbook-v2.md): Korean titles/notes/choices, units and connections, stable hidden field keys and readable guide/reference tabs.
5. Verify real click/edit/save/recovery/return paths at PC/tablet/phone portrait/landscape with keyboard/touch. Screenshots alone do not prove function; viewport emulation does not prove physical-device accessibility/performance.
6. Significant visual changes update affected regressions and design rules. Record changed assumptions through [documentation governance](../../../docs/architecture/documentation-governance.md).

Do not invent arbitrary per-screen colors, radii or button sizes.

For editor terminology/time changes read [current contract](../../../docs/architecture/editor-terminology-and-time.md). Use seconds in authoring inputs, keep document milliseconds/IDs intact, and verify nested guide dismissal preserves parent drafts.

## 작업별 편집 UI

- [현재 편집 작업 영역](../../../DESIGN.md#편집-작업-영역--2026-10-19-후속-설계)을 먼저 따른다. 기존 editor-redesign 후보/최종 목업은 날짜와 대체 범위를 확인한다. 현재 설계를 과거 이미지에 맞춰 되돌리지 않는다.
- 기본편집은 현재 실제 장면·글과 작은 앞뒤 맥락, 글/배경/인물/음향/연출 화면은 여러 컷의 주 작업과 선택한 읽기 전용 함께 보기로 구성한다. 편집 개방과 단순 표시를 구분한다.
- 반복 입력은 직접 수정, 복잡한 상세는 필요한 컷에서만 열기. 인물/음향/연출과 선택지/점수/분기조건은 명시 개방이며 기존 원고 데이터로 자동 개방하지 않는다. 모든 우회 진입점도 확인한다.
- UI 상태는 저작 문서와 분리한다. 화면 왕복의 커서/스크롤, 한글 조합, 좁은 화면, 기존 파일 왕복 및 기능 닫기 후 원고 보존을 집중 검증한다. 브라우저의 커서 노출 스크롤과 앱의 강제 목록 이동을 구분한다.
- 실제 장면은 Ren’Py 하나로 유지한다. 여러 컷의 자료 썸네일을 실제 합성 장면으로 표시하지 않는다. 새 source 변경에 맞춘 실제 캡처를 생성하고 원본 과거 이미지/증거는 보존한다.

- 편집 viewport 작업은 [화면 안 맞춤](../../../DESIGN.md#화면-안-맞춤--사용자-확정-141)을 따른다. 세로 휴대폰 기본편집1:4:1(앞 글/가로 native 장면+현재 글/뒤 글), 태블릿·웹의 같은 작업 구조, 페이지 대신 필요한 목록 내부 스크롤을 확인한다. 가용 visualViewport와 키보드 축소·짧은 가로 화면도 대조한다. 고정 비율은 설계 기준이며 전체 UI를 여백 상자에 넣지 않는다.

- 편집 상단의 보조 기능은 [상단 최소화](../../../DESIGN.md#편집-상단-최소화--2026-10-19-최신-보정)에 따라 단일 가로줄 세 개 ‘설정’ 메뉴로 묶는다. 별도 줄임표·작품·보기·기능 개방 입구를 상시 나열하지 않는다. 기능을 없애지 말고 목적별 그룹으로 옮기며 Escape/초점 복귀와 기존 파일/기능 개방을 확인한다.

- 기본편집/글/배경/인물/음향/연출의 화면 선택도 단일 설정 메뉴 안에 둔다. 별도 상시 탭/버튼 줄을 복원하지 않는다. 개방한 고급 화면만 선택 항목에 포함하고 화면 변경 뒤 메뉴를 닫는다.

- 편집/플레이의 설정 팝업은 [스토리 게임 시스템 메뉴](../../../DESIGN.md#스토리-게임-시스템-메뉴--2026-10-19)에 따라 공통 `--story-menu-*` 팔레트를 사용한다. 팝업만 범위를 한정하고 기본 편집/장면/읽기 도구 배치를 바꾸지 않는다. 내부 입력·상태·오류·저장 슬롯과 native 폼 dark scheme, 초점/닫기/복귀·원고 보존을 실제 팝업에서 확인한다.

- 다른 팝업을 개선할 때 [용도별 팝업](../../../DESIGN.md#용도별-팝업--2026-10-19)을 따른다. 간단 확인/자료 선택/대형 편집/서재 책 무대를 구분하고, 작은 창·정보 위계·취소/적용·Tab/Escape/복귀·320px/짧은 가로를 실제로 검증한다. 계정·온라인 메뉴의 겹침/바깥 닫기와 작성 데이터 보존을 확인한다. 전역 Web/iframe 장면과 표지 artwork에는 dialog색상을 덮지 않는다.

- 연결·점수·삭제 안내는 [사용자 언어](../../../DESIGN.md#작가가-이해할-수-있는-연결-정보--2026-10-19)를 따른다. 내부 개수/용어 대신 실제 장·컷·선택지와 이름 있는 점수의 비교값/그리고·또는/기본 처리를 표시한다. 정확한 authored ID를 사용하며 연결/독자 상태를 추정하거나 원고를 수정하지 않는다.

- native 미리보기의 화면 전환은 [양수 크기 파킹 계약](../../../DESIGN.md#비활성-native-미리보기의-화면-크기--2026-10-19)을 따른다. iframe부모에 hidden/display:none을 두지 말고 명시 양수 크기·visibility/inert/aria-hidden으로 유지한다. 비동기 시작 지연 후 실제 렌더응답·내부viewport/canvas·경고와 원고 보존을 검증한다. SDK경고 억제나 별도렌더러로 우회하지 않는다.

- 편집 설정을 유지할 때 [탭 세션 계약](../../../DESIGN.md#편집-설정의-탭-세션-유지--2026-10-19)을 따른다. 작품별 screen/개별 개방/함께 보기만 sessionStorage에 두고 원고·파일에 섞지 않는다. 새로고침 복원·작품 간 분리·닫힌 화면 fallback·저장소 차단에서 편집/파일 보존을 확인한다.

- 사용자 문구는 [제품 용어 사용 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 화면/설정/버튼/상태/도움말/접근성 이름을 대조하고 이전 이름은 검색 별칭으로만 남긴다. 작품 파일 저장·임시 보관·온라인 업로드와 편집 사용·함께 보기를 구분한다. 원고/ID/이전 evidence의 일괄 치환은 금지한다.

- 같은 편집 파일은 작품 파일 한 이름으로 부른다. 임시 보관은 브라우저의 보조 기능이고, 독자의 진행 저장·지난기록·작가의 이전 원고와 구분한다. 메뉴를 구현 저장소 이름으로 늘리지 말고 최신 용어 소유 문서의 역할/대상 표를 먼저 확인한다.

- 같은 팝업을 숏스토리에 표시할 때 상위 header 문단/actions 선택 버튼의 CSS가 메뉴 텍스트·배경을 덮지 않는지 실제 색/대비와 초점·닫기를 확인한다. 컴포넌트 범위에서 교정하고 페이지/인쇄/그림에 전역 색을 덮지 않는다.

- 말하는 인물 상세 도구는 [현재 작업 화면 기준](../../../DESIGN.md#편집-작업-영역--2026-10-19-후속-설계)에 따라 인물 편집 개방 뒤에만 제공한다. 한글 조합 중 활성 입력까지 fieldset으로 비활성화하지 말고 이동·등록·배치 조작을 따로 잠근다. 작품/컷 변경 시 이전 상세 초안·오류가 따라오지 않는지 확인한다.

- 임시 보관 차단/실패 안내를 고정 viewport 편집기 밖에 두지 않는다. 원고를 잃을 수 있는 다시 열기에는 소실 안내·기본 취소·Esc/초점 복귀를 제공하고, 실제 포인터로 버튼을 누를 수 있는지 확인한다. 파일 다운로드 요청을 파일 저장 완료로 판정하지 않는다.
