# 효과 시작 컷 이동

2026-10-11. [범위 저작 계약](cut-range-authoring-contract.md)의 시작점 편집을 효과에 연결했다. 연출 도구 안의 접힌 ‘효과 시작 컷 옮기기’에서 옮길 효과와 새 컷을 선택하고 명시적으로 적용한다. 선택만으로는 원고를 바꾸지 않는다.

## 계약

현재 컷에서 선택한 cue 하나를 제거하고 새 컷의 효과 목록 마지막에 붙인다. effect ID·대상·강도·trigger·delay/duration·repeat/period·endLineId를 보존한다. 대기 시간은 새 시작 컷 기준이며 종료 컷은 그대로다. 배열 순서가 실제 Flow 재생 순서와 다르므로 앞/뒤 인덱스로 범위를 제한하지 않는다. 종료 컷 우회 시 유지되는 기존 의미를 설명한다.

새 컷의 효과3개 제한, 같은 ID 충돌, 존재하지 않는 actor target은 적용 전에 오류로 막는다. 원고·말하는 이름·Flow·소리·배치·다른 연출은 유지한다. 화면/배경 효과는 같은 대상으로 적용하며 배경 자료가 달라질 수 있음은 현재 컷 미리보기로 확인한다. helper는 두 컷 변경을 한 candidate로 검증해 반쪽 이동을 저장하지 않는다. 임의 actor remap이나 다른 효과 덮어쓰기는 하지 않는다.

되돌리기는 두 컷의 효과 목록이 이동 결과와 같을 때만 원래 목록으로 복구한다. 이후 수정한 글·look/transition 등 다른 필드는 보존한다. 관련 효과를 다시 수정했거나 컷/작품이 바뀌면 오래된 상태로 덮어쓰지 않는다. 효과가0개가 되어도 이동 도구는 같은 부모에 남아 바로 되돌릴 수 있다. 기존 마지막 효과 변경 취소는 이동 후 초기화해 원본 cue를 중복 복구하지 않는다.

기존 StoryDocument7/workbook7/archive2/JSONB 필드로 표현하므로 버전은 바꾸지 않는다. 배경음/주변 소리 시작점 이동과 갈래 한정 범위는 별도 남은 작업이다.

## 검증

[RED](evidence/effect-start/red.log), [Core/전체 왕복](evidence/effect-start/unit-current.log): 원본 다른 cue·대상 cue·원고·설정·종료점 보존, 원자적 이동, 이후 글 유지 undo, actor 부재/효과3개 오류, stale undo 거부, archive/workbook/Excel/JSONB 전체 equality, 새 시작점→종료점 포함→다음 컷 효과 종료 해석. 첫 fixture의 잘못된 효과 type과 효과 전체가 없는 RuntimePresentation의 undefined/false 검사 차이를 고친 로그는 [이전 단위](evidence/effect-start/unit-final.log)에 보존한다.

[PC/폰 UI](evidence/effect-start/ui.log): 시작점 선택→이동→원본 글 수정→undo→재이동→도착 컷에서 종료점 확인→저장/재열기→파일 반출. [최종 정적](evidence/effect-start/static-final.log)은 기존 범위 native 재생과 왕복도 함께 검사한다. [타입](evidence/effect-start/typecheck-final.log), [lint](evidence/effect-start/lint.log), [빌드](evidence/effect-start/build.log), [전체 coverage](evidence/effect-start/coverage-final.log). programmatic XLSX 검사를 실제 Google/Excel 앱의 이번 조작으로 표현하지 않는다.

전체 승인 목표는 범위/갈래·소리 시작점·실기기·시각 검증을 포함하며 이번 효과 이동만으로 완료하지 않는다.

최종 정적4개·Core/전체왕복3개 통과. 전체133파일/1158개 통과·기존1개 skip, statements93.50%/branches91.13%/functions96.66%/lines98.68%. TypeScript6 workspace·빌드·최종 lint·문서·diff whitespace 검사 통과. [최종 lint](evidence/effect-start/lint-final.log), [실제 이동 입력](evidence/effect-start/start-control.png). 리뷰에서 두 컷 원자 갱신·actor 존재/3개 제한·효과 배열 충돌 undo·per-cue undo 초기화·기본 E2E 포함을 확인했고 차단 결함은 없었다.

자기 점검: 정확성4(전체 문서 검증·cue/end 보존·native 범위 회귀), 완결성4(효과 시작점/되돌리기·원고 이후 편집·파일/표/JSONB·소리 시작점 별도), 명료성4(새 컷 기준 대기·종료점 우회 설명), 실행 가능성4(현재 연출 도구 연결), 간결성4(선택적 접힘·기존 필드), 평균4.0. 다음은 연속 소리 시작점과 갈래 한정 범위의 완결이다.
