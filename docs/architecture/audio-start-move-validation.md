# 배경음·주변 소리 시작 컷 이동

2026-10-11. [효과 시작점 이동](effect-start-move-validation.md)에 이어 기존 컷 소리 play 지시의 시작점 이동을 소리 도구에 연결한다. 새 음원 취득/등록은 하지 않는다.

## 계약

접힌 ‘연속 소리 시작 컷 옮기기’에서 배경음 또는 주변 소리와 새 컷을 고른 뒤 명시적으로 적용한다. 현재 채널의 play 지시만 옮기고 Asset ID·음량·반복·fadeIn/fadeOut·endLineId를 그대로 둔다. 원본은 그 채널 지시가 없어 앞 컷/장 소리를 이어받는다. 중간의 기존 지시와 장 진입 지시가 우선한다. 종료점을 우회하는 경로에서 계속 유지되는 기존 의미를 안내한다.

도착 컷에 같은 채널의 play/stop/maintain 중 어떤 명시 지시라도 있으면 덮어쓰지 않고 오류로 막는다. 다른 채널과 효과음·글·Flow·연출·자유 배치는 유지한다. 두 컷을 하나의 candidate로 검증해 원본만 지워지는 반쪽 이동을 저장하지 않는다. 장 기본 소리 이동은 이 기능의 범위가 아니다.

되돌리기는 이동한 두 컷의 해당 채널이 결과와 일치할 때만 수행한다. 원래 미설정/빈 audio 상태도 복원하고 이후 고친 글/다른 채널/효과음을 보존한다. 해당 채널이 다시 바뀌면 stale undo를 막는다. 기존 마지막 소리 변경 취소는 cross-cut 이동 시 초기화해 cue 중복 복구를 방지한다. 작품/컷 key로 UI 이동 상태를 분리한다.

기존 StoryDocument7/workbook7/archive2/JSONB 필드로 저장하며 버전은 유지한다. Core가 실제 읽기 경로로 소리를 해석하고 Ren’Py에는 재생/정지만 전달한다. 시작/끝 컷의 원고 순서가 실제 경로 순서를 대신하지 않는다.

## 검증

[RED](evidence/audio-start/red.log), [단위2개](evidence/audio-start/unit-final.log): 선택 채널 이동·다른 소리/원고 유지·후속 편집 undo·도착 지시 충돌·동일 컷 거부·stale undo·실제 새 시작/종료 Core 해석·archive/workbook/Excel/JSONB 전체 equality. [PC/폰 UI](evidence/audio-start/ui.log): 원본/대상 선택·이동/undo/재이동·종료점 확인·저장/재열기·전체 작품 반출.

[정적 회귀](evidence/audio-start/static-final.log)는 기존 종료 범위/native 회귀도 포함한다. [새 위치 실제 native](evidence/audio-start/native-final.log)는 Ren’Py sceneRendered/audioState의 이동한 배경음 경로와 읽기→편집 복귀를 확인한다. [빌드](evidence/audio-start/build.log), [타입](evidence/audio-start/typecheck-final.log), [lint](evidence/audio-start/lint.log), [전체 coverage](evidence/audio-start/coverage.log). 단위 XLSX 결과를 이번 실제 Excel/Google 원격 앱 편집으로 주장하지 않는다.

갈래 한정 범위·효과음 일괄 적용·실제 외부 앱 종료 열 편집·전체 도안의 시각/기기 검증은 기존 [범위 계약](cut-range-authoring-contract.md)과 STATUS에 남긴다. 이번 이동 기능만으로 활성 목표를 완료하지 않는다.

전체134파일/1160개 통과·기존1개 skip, statements93.53%/branches91.19%/functions96.63%/lines98.69%. 정적 회귀4개 통과. 첫 native 소리 검사는 자동 재생이 잠긴 상태여서 실패했으며 [실패 기록](evidence/audio-start/native-final.log)을 보존한다. Ren’Py sceneRendered 후 실제 iframe의 최신 화면 위치에서 사용자 클릭으로 소리를 활성화하는 [최종 native 검사](evidence/audio-start/native-verified.log)를 별도로 수행한다. 녹음 청취/모든 삼성 기기 지원 증거로 확대하지 않는다. [최종 lint](evidence/audio-start/lint-final.log), [문서](evidence/audio-start/docs.log).

최종 native PC/폰2개 통과. 소스 리뷰에서 원자적 두 컷·선택 채널·기존 지시 충돌·종료점/음량/반복/페이드 보존·후속 다른 채널 편집 undo·이동 후 단일 컷 undo 초기화를 확인했고 차단 결함은 없었다. TypeScript6 workspace·lint·빌드·문서·diff whitespace 검사 통과.

자기 점검: 정확성4(전체 equality·Core 및 actual native 소리 경로), 완결성4(PC/폰·이동/undo·저장/복귀·장 기본 이동 별도), 명료성4(원본 상속·중간 지시 우선·충돌 거부), 실행 가능성4(현재 소리 도구 연결), 간결성4(기존 play 필드·저장 형식 유지), 평균4.0. 다음은 갈래 한정 범위와 실제 외부 양식 편집 검증이다.
