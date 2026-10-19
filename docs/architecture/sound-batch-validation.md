# 효과음 여러 컷 추가

2026-10-11. [범위 저작](cut-range-authoring-contract.md)의 효과음 반복 조작을 줄이는 UI를 기존 소리 도구에 연결했다. 음원 추가·취득 없이 현재 컷의 효과음 하나를 명시적으로 선택한 다른 컷들에 추가한다.

## 계약

현재 컷과 적용 컷은 구분한다. 소리 도구의 접힌 ‘효과음을 여러 컷에 추가’에서 원본 효과음과 적용 컷 체크박스를 선택한다. 각 컷의 장·컷·글을 표시하고 선택한 수를 알려 준다. 선택 취소는 콘텐츠를 바꾸지 않는다. 순서상 범위 또는 갈래 범위로 오인하지 않게 명시적 선택이며, 해당 컷에 실제 들어올 때마다 한 번씩 재생한다. 연속 배경음처럼 컷 사이에 계속 재생하는 구간이 아니다.

효과음 Asset ID·음량·대기 시간은 복사하되 각 대상 컷에 새 고유 cue ID를 생성한다. 기존 효과음을 마지막에 이어 추가하고 배경음·주변 소리·글·Flow·인물 배치·효과를 유지한다. 한 번에200컷까지이며, 대상 컷 누락/중복·새 ID 중복/기존 컷·장 cue 충돌·컷4개 제한 중 하나라도 오류면 전체 candidate를 적용하지 않는다. Core는 전체 StoryDocument를 검증한다.

undo는 이번에 추가한 ID의 cue가 변경되지 않았을 때만 해당 cue를 제거한다. 이후 추가한 다른 효과음/소리 채널/원고를 유지한다. 삭제된 cue·변경된 cue 또는 작품/대상 컷 변화는 오래된 복구를 거부한다. 미설정/빈 sounds/audio 상태를 원본 기준으로 복원한다. 기존 한 컷 소리 undo는 일괄 변경 시 초기화해 다른 컷과 분리된 이전 snapshot이 덮지 않도록 한다.

기존 StorySoundCue·audio.sounds 배열을 사용하므로 StoryDocument7/workbook7/archive2/JSONB 버전을 바꾸지 않는다. 새 실행 범위 필드를 도입하지 않는다. Core 해석→단일 Ren’Py 재생 경계를 유지한다.

## 검증

[RED](evidence/sound-batch/red.log), [단위2개](evidence/sound-batch/unit-final.log): 새 ID/명시 선택·기존/선택 외 컷 보존·후속 글/다른 효과음 undo·일부 대상4개면 전체 거부·stale undo·각 컷 Core 효과음 delay 해석·archive/workbook/Excel/JSONB 전체 equality.

[첫 UI](evidence/sound-batch/ui.log)는 hydrate 완료 전에 읽은 기본 option ID를 검사에 사용해2개 실패했고, 기기 저장 준비 완료 후 대상 ID를 읽도록 고친 [UI](evidence/sound-batch/ui-second.log)에서 PC/폰2개 통과했다. 실제 제품에 실패를 숨기는 임의 지연을 넣지 않았다. 선택 취소→선택2컷→적용→이후 글 수정→undo→재적용→저장/재열기/파일 반출을 확인한다. [최종 정적 빌드](evidence/sound-batch/static-final.log)는 연속 소리 시작점 이동/native 회귀도 포함한다.

[타입](evidence/sound-batch/typecheck-final.log), [lint](evidence/sound-batch/lint-final.log), [빌드](evidence/sound-batch/build.log), [coverage](evidence/sound-batch/coverage.log). 프로그램 XLSX 왕복을 이번 실제 Excel/Google 앱 조작으로 주장하지 않는다. 갈래 한정 실행 범위와 실제 외부 종료 열 검증·삼성 실기기 등은 기존 목표에 남긴다.

최종 정적4개 통과. 전체135파일/1162개 통과·기존1개 skip, statements93.53%/branches91.19%/functions96.61%/lines98.69%. 타입6 workspace·lint·빌드·문서·diff whitespace 검사 통과. 소스 리뷰에서 cue append/고유 ID·원자 적용·4개 한계·미설정 복구·나중에 추가한 cue 보존과 기본 host/stories-runtime spec 포함을 확인했고 차단 결함은 없었다. [휴대폰 실제 입력](evidence/sound-batch/batch-control-phone.png).

자기 점검: 정확성4(Core 소리 해석·전체 equality), 완결성4(선택/취소/적용/undo·제한·저장/파일·실기기 별도), 명료성4(명시 선택과 연속 범위 구분), 실행 가능성4(현재 소리 도구 연결), 간결성4(기존 cue·저장 형식·접힘 도구), 평균4.0. 다음은 갈래 한정 실행 범위와 실제 외부 앱 종료 열 편집이다.
