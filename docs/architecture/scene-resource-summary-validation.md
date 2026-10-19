# 현재 장면 자료 요약과 기존 편집 연결

2026-10-11. [승인 개편](approved-ui-development-plan.md)과 [legacy 계승](legacy-editor-ux-improvement-plan.md)의 UX-RELATED에서 남은 현재 장면 자료 요약을 연결했다. 기본 글 화면에는 새 패널을 추가하지 않고 배경·인물 도구 안에 접힌 ‘현재 배경·인물 확인’을 둔다.

## 계약

StorySceneResources는 현재 해석된 StageComposition과 Asset Registry를 사용한다. 배경은 컷 지정→장→작품 기본값, 그림 없음은 숨김으로 표시한다. 인물은 자료 이름과 저작 가로 위치/자동/중앙, 크기 배율, 방향, motion을 표시한다. 배율은 asset의 최종 화면 크기가 아닌 저작 배율임을 ‘저작 배치 정보’로 명시한다. 썸네일은 자료 그림이며 실제 장면은 기존 단일 Ren’Py에서 확인한다. 별도의 Web Stage나 좌표 해석을 만들지 않는다.

배경 설정/인물 배치 버튼은 같은 inspector의 기존 입력에 초점과 스크롤을 옮긴다. 버튼을 눌러서 저작 값을 자동 변경하지 않는다. 선택한 인물의 위치를 수정하면 기존 updateActor/patch 경로로 저장하고 요약이 같은 값으로 갱신된다. 현재 작품/컷이 바뀌면 접힌 상태로 돌아오며 입력·자동 저장만으로 접힘을 바꾸지 않는다. 리스트만 가용 높이 안에서 스크롤하고 긴 한국어 이름/설명은 줄바꿈한다. 기존 테두리·선택/초점·터치 규칙을 사용한다.

새 StoryDocument/workbook/JSONB 필드나 버전을 만들지 않는다. 원고·Asset ID·Flow·StageComposition·사용자 자유 배치와 기존 기본값의 의미를 유지한다. 기존 [메모 참조](editor-related-memos-validation.md)와 함께 UX-RELATED 우선 범위의 직접 연결을 완성하되 전체 활성 승인 목표 완료로 확대하지 않는다.

## 검사

[RED](evidence/scene-resources/red.log), [첫 UI4개](evidence/scene-resources/ui.log):PC1440/태블릿768/휴대폰390/가로844에서 접힘·배경 초점·선택 인물 초점·38% 위치 수정·원고 유지·저장/재열기·가로 경계. [최종 정적 빌드](evidence/scene-resources/static-final.log)는 기존 승인 편집/IME/저장 실패/점수·선택 네 조합/키보드 가림 회귀와 현재 인물0명·그림 없음·동일 iframe 확인도 포함한다.

[Core 및 원고 보존 단위18개](evidence/scene-resources/unit.log), [타입](evidence/scene-resources/typecheck.log), [lint](evidence/scene-resources/lint.log), [빌드](evidence/scene-resources/build.log). 리뷰에서 기존 Core 배경 해석 순서·현재 actor key의 입력 대상·기본 검사 suite 포함·동일 컷 펼침 유지·자료 그림 경계를 확인했고 차단 결함은 없었다. 향후 이름 변경 시 입력 이동 경로도 함께 수정하고 E2E로 확인한다.

검증 범위는 현재 fixture와 Chromium viewport다. 삼성 실기기/보조 기술, 상위 경로 탐색과 범위 연출은 STATUS의 기존 후속 목표를 유지한다.

최종 정적 빌드11개와 단위18개,6 workspace 타입·lint·빌드·문서 링크·diff whitespace 검사 통과. [PC 요약](evidence/scene-resources/resource-panel-1440.png), [휴대폰 요약](evidence/scene-resources/resource-panel-390.png)은 제품의 자료 요약 영역 자체를 캡처한다. 별도 story renderer나 이미지 도안으로 결과를 대신하지 않는다.

자기 점검: 정확성4(Core와 같은 배경 해석·해석된 stage·저작값 구분), 완결성4(읽기 전용 요약·입력 초점·수정/저장·없음 상태·인스턴스 유지), 명료성4(자료 그림과 실제 장면 구분), 실행 가능성4(기존 입력에 직접 연결), 간결성4(추가 도구 안의 접힌 요약), 평균4.0. 다음은 상위 경로/범위 연출 등 전체 활성 목표의 남은 동선을 검사하는 것이다.
