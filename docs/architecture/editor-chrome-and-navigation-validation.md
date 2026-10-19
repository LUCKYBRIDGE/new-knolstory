# 편집 상단 밀도·버튼 경계·미리보기 컷 이동

2026-10-11. 사용자 첨부 화면에서 큰 제목·위치·저장 상태와 관리/편집 도구 줄이 작업 공간을 지나치게 차지하고 테두리 없는 동작 입구가 불분명했다. [승인 개편 계획](approved-ui-development-plan.md)의 실제 작업 공간을 개선한다.

## 구현

작품 관리 header 안에 작품 제목·저장 상태·현재 장/컷 선택과 화면 설정을 배치했다. 중복 위치 문구와 상시 도구 닫기를 줄였다. 현재 위치는 장·컷 선택의 표시로 확인하고 선택의 접근성 이름을 유지한다. 작품 제목 원문은 줄바꿈하며 잘라 변경하지 않는다. 도구는 글/배경·인물/선택지/연출/컷 목록/소리의 짧은 이름을 사용하되 접근성 이름·title에는 실제 편집 기능을 유지한다. 컷 목록 닫기와 열린 추가 도구의 닫기 입구는 필요한 상태에만 나타난다.

편집 화면의 동작 button과 details summary에는 테두리를 표시하고 선택된 버튼/열린 summary는 색과 경계로 구분한다. 작은 PC chrome은32px와12px, 휴대폰/coarse pointer는44px 조작 영역이다. 대사·원고 입력의 글 크기를 이 상단 축소로 줄이지 않는다. 관련 선택/비율 label의 margin·display를 수정해 두 줄 높이 낭비를 줄인다. 현재 컷/장 대본 버튼은 같은 CSS 규칙의 테두리를 적용한다.

`StagePreviewFrame`은 미리보기 바깥 좌우의32px/터치44px 좁은 gutter에 ‹/›를 둔다. 장면·인물 손잡이를 덮지 않는다. 원고 순서의 앞뒤 컷을 이동하며 장 경계도 넘는다. 첫/마지막 컷·한글 조합 중에는 비활성화한다. `selectCut`의 저장 실패 보호를 그대로 사용하고 대본 보기에서 이동하면 도착 장도 갱신한다. 기존 인접 컷 글 요약은 유지한다. 읽기 때 같은 wrapper를 display:contents로 바꾸어 iframe을 재생성하지 않는다. 독자 진행은 기존 Core Flow를 사용한다.

원고·Asset ID·Flow·StageComposition·자유 배치·문서/표/JSONB 형식은 바꾸지 않는다. [RED](evidence/editor-chrome/red.log)의 PC viewport top321.7px에서 [실제 native 측정](evidence/editor-chrome/measurements.json)의130px로 줄었다. 측정은 해당 viewport와 작품 기준이며 긴 사용자 제목과 기기 배율 전체를 대표하지 않는다.

## 검사·증거

[새 동선5개](evidence/editor-chrome/ui-final-2.log):1440/768/390/844 상단·summary 테두리·화살표의 장면 바깥 배치·컷 왕복·IME·가로 넘침, 대본의 장 경계 이동·저장 실패 보호. [실제 PC](evidence/editor-chrome/compact-editor-1440.png), [태블릿](evidence/editor-chrome/compact-editor-768.png), [휴대폰](evidence/editor-chrome/compact-editor-390.png), [가로](evidence/editor-chrome/compact-editor-844.png)은 실제 Ren’Py 준비 응답 후 캡처했다.

[회귀 최초 실행](evidence/editor-chrome/regression.log)은 승인 편집/읽기·긴 한국어 이름표/선택지·메뉴 경계·읽기 복귀를 함께 검사한다. 현재 저장 슬롯3판인데2판을 기대한 검사를 현재 소스에 맞췄다. 서재 복귀의 비동기 자동 슬롯 저장 후 workspace 저장이 실패할 때 확인창이 순간 닫히는 문제는 자동 슬롯 저장 중 confirmation을 유지하도록 고쳤다. 독자와 현재 작품은 실패 후에도 유지한다. [최종 회귀](evidence/editor-chrome/regression-final.log), [타입](evidence/editor-chrome/typecheck-final.log), [lint](evidence/editor-chrome/lint.log), [빌드](evidence/editor-chrome/build.log).

전체 목표는 여전히 승인 도안 기능과 남은 범위/경로/배치 동선을 포함한다. 상단 축소만으로 전체 개편 완료를 주장하지 않는다. 삼성 실기기/접근성·배율 검증은 기존 후속 목표를 유지한다.

최종 결과: 최초 통합34개 중32개 통과/2개 실패. 실패 원인 수정 후 최종 정적 빌드12개가 통과했으며, 저장 맥락 ref를 render가 아닌 layout effect에서 갱신하도록 lint 결함을 고친 뒤 최종 빌드의 해당 읽기3개도 통과했다. [마지막 읽기 검사](evidence/editor-chrome/reader-final.log), [최종 빌드](evidence/editor-chrome/build-final.log), [최종 lint](evidence/editor-chrome/lint-final.log). Lint error0, 기존 native 캡처 data URL img의 성능 권고 warning1은 남는다. 작은 수동 저장 썸네일에 Next image 최적화 파이프라인을 새로 붙이지 않았다.

전달 자기 점검: 정확성4(실제 native 캡처·geometry·기존 guard 검사), 완결성4(상단/동작 경계/화살표 연결·전체 승인 목표 잔여 유지), 명료성4(짧은 보이는 이름과 접근성 이름 분리), 실행 가능성4(PC/태블릿/폰 클릭과 저장 실패 보호), 간결성4(중복 위치/버튼 제거), 평균4.0. 다음 개선은 사용자 작품의 긴 이름·글과 실제 삼성 입력 환경을 포함한 후속 검사다.
