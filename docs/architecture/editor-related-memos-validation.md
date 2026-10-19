# 현재 장·컷의 창작 메모 참조와 편집 복귀

2026-10-11. [승인 편집 개편](approved-ui-development-plan.md)과 [legacy 계승](legacy-editor-ux-improvement-plan.md)의 UX-RELATED를 진행한다. 기본 글 입력·장면·인접 컷을 유지하고 연결 메모가 있는 경우에만 접힌 ‘관련 창작 메모’ 입구를 표시한다.

## 범위와 보존

메모의 글을 편집 화면에 중복 저장하지 않는다. 기존 StoryProject.creativeMemos의 같은 ID와 fields를 읽어 표시하고, 수정은 기존 StoryPreparation/MemoEditor에서 수행한다. 원고·Flow·StageComposition·소리·연출·메모 링크와 미해결 참조는 유지한다. 새 저작 필드·파일/workbook/JSONB 버전은 만들지 않는다.

현재 컷에 직접 연결한 메모, 현재 장 전체에 연결한 메모, 명시적 복수 장/컷 연결을 구분한다. 단일 linkedLineId와 함께 저장된 linkedChapterId는 해당 컷의 위치 맥락이므로 같은 장의 모든 컷에 확장하지 않는다. 명시적 linkedChapterIds는 장 연결로 인정한다. 다른 컷/삭제된 컷의 메모를 현재 컷 메모로 오인해 보여주거나 링크를 자동 고치지 않는다. 작품 준비의 기존 검색 필터 의미는 변경하지 않는다.

‘이 메모 수정’은 현재 글을 동기 저장한 뒤 해당 메모 제목으로 초점과 스크롤을 이동한다. 저장 실패면 편집 화면에 남는다. 긴 작품 준비에서 작은 고정 복귀 버튼을 제공하고, 같은 원고 컷 편집으로 돌아오기 전에도 저장한다. 다른 메모·기획은 원래대로 유지한다. 보호 사본이 필요하면 새 project ID에 메모 복귀 요청만 명시적으로 이어 주며, memo/cut ID는 복제된 원고의 기존 ID를 사용한다. 이 요청은 메모리의 UI 상태이며 작품 파일에 넣지 않는다. 다른 작품의 요청을 덮어쓰지 않는다.

## 검사와 증거

[PC 참조 화면](evidence/editor-related-memos/related-memos-1440.png), [태블릿](evidence/editor-related-memos/related-memos-768.png), [휴대폰](evidence/editor-related-memos/related-memos-390.png), [가로](evidence/editor-related-memos/related-memos-844.png). 최신 조합 보호4개는 모두 통과했다.

[RED](evidence/editor-related-memos/red.log): 새 관련 메모 분류가 없는 상태. [단위](evidence/editor-related-memos/unit-final.log): 직접 컷/장·명시 복수 연결·다른 컷/미해결 참조 제외·보호 사본 복귀 요청과 기존 메모 연산. [첫 UI](evidence/editor-related-memos/ui.log): 네 viewport에서 기본 접힘·올바른 메모 내용·정확한 메모 초점·수정/같은 컷 복귀·저장/재열기/파일 반출 및 미수정 원고/다른 메모 전체 equality.

[정적 빌드 회귀](evidence/editor-related-memos/static-final.log): 네 화면과 기존 메모 관리1개(5 viewport)의 항목 추가·재정렬·삭제 undo·검색·파일 fresh-context 재반입까지5개 통과. [최신 빌드](evidence/editor-related-memos/build-final.log), [최신 UI](evidence/editor-related-memos/current-final.log), [coverage](evidence/editor-related-memos/coverage.log), [타입](evidence/editor-related-memos/typecheck-final.log), [lint](evidence/editor-related-memos/lint-final.log). 최신 화면 캡처는 실제 Ren’Py 준비 응답을 확인한 뒤 수행한다. 실제 Google 원격 앱이나 데이터베이스에 이번 요청을 쓴 증거로 표현하지 않는다.

현재 장면 자료 요약/직접 편집 연결, 상위 경로 탐색과 전체 범위 연출은 [계승 계획](legacy-editor-ux-improvement-plan.md) 및 [STATUS](../../STATUS.md)의 후속으로 남긴다. 연결 메모의 참조·편집 복귀를 붙인 것으로 전체 승인 목표를 완료하지 않는다. 삼성 실기기/접근성 검증도 별도다.

전체 검사131파일/1152개 통과·기존1개 skip, statements93.50%/branches91.15%/functions96.76%/lines98.67%. 최신 source의 UI4개도 통과했다. 메모 입력 한글 조합 중 복귀 버튼을 비활성화한 보완은 [조합 보호 검사](evidence/editor-related-memos/ime-final.log), [해당 빌드](evidence/editor-related-memos/build-current.log), [최신 lint](evidence/editor-related-memos/lint-current.log)에 기록한다. 브라우저 composition event 검사는 삼성 실기기 입력기 검증을 대신하지 않는다.

리뷰에서 보호 사본 전환 전의 project ID가 남으면 정확한 메모 focus/복귀 요청을 숨길 수 있음을 확인했다. 사본 생성 성공 시 요청의 작품 ID만 remap하고 다른 요청은 유지하도록 수정했으며 단위로 검사했다. 메모 수정은 기존 콘텐츠를 사용한다. 새로운 linked memo 저장소를 만들지 않았다.

자기 점검: 정확성4(현재 코드·기존 메모·전체 equality와 UI), 완결성4(참조/정확한 수정/복귀/파일·한글 보호·실기기 별도), 명료성4(장 맥락과 직접 컷 링크 구분), 실행 가능성4(실제 작품 준비 연결·저장 guard), 간결성4(없으면 입구도 없음·기존 메모 편집 재사용), 평균4.0. 후속은 장면 자료 요약과 상위 갈래 탐색이며 전체 승인 도안의 범위 검증을 유지한다.
