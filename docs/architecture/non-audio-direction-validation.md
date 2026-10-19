# 비음원 연출 개선 검증 기록

2026-10-10. 현재 코드의 결과와 최초 실패/수정 재실행을 분리한다. [계약](non-audio-direction-contract.md), [계획·분류](presentation-authoring-development-plan.md). 전체 제품 출시나 실제 서버 운영 완료 기록이 아니다.

## 입력·환경·보존

Ren’Py8.5.3을 runtime:build 후 Web build 순서로 재생성했다. 정적 Web과 같은 runtime를 Chrome에서 검사한다. 실제 별주부전 작품 기반292컷의 검증 사본과 기존 presentation-polish의 자유 배치x37/배율1.17·긴 한국어 원고를 사용한다. 기본 원작을 자동 변경하지 않는다.

[별주부전 파일](evidence/non-audio-direction/rabbit-effect-duration.knolstory), [XLSX](evidence/non-audio-direction/rabbit-effect-duration.xlsx), [JSONB](evidence/non-audio-direction/rabbit-effect-duration.jsonb.json). 이 fixture의 추가 원고와 연출은 검증용 사본에만 있다. 전체 비교는 원고·Asset ID·Flow·StageComposition·자유 배치를 포함한다.

## 확인된 결과

- [전체 단위/coverage](evidence/non-audio-direction/unit-coverage-bounded.log):116개 파일/1109개 통과/1개 artifact 생성 제외. Statements93.52%, branches91.16%, functions96.79%, lines98.70%. 최초 기본 병렬 검사에서5초 XLSX timeout5건이 있었으며 [원래 로그](evidence/non-audio-direction/unit-coverage.log)를 보존하고 maxWorkers2로 재실행했다. 이후 추가한 취소·크기 경계 검사는 별도 실행 결과로 관리한다.
- [실제 외부 앱 비교](evidence/non-audio-direction/actual-external.log):Mac Excel과 Google Sheet 연출 효과I3를1.23→0.6초로 수정·저장/반출했다. 두 XLSX 전체 archive 비교에서 첫 durationMs1230→600만 달라지고 JSONB 직렬화/복원과 Core delay230/duration600도 통과했다. [Excel](evidence/non-audio-direction/rabbit-excel-edited.xlsx), [Google 반출](evidence/non-audio-direction/rabbit-google-edited.xlsx). Google [검증 시트](https://docs.google.com/spreadsheets/d/1qqS5SG3gpNOMfVsdMIUKFSc4AIbctsgdzLSIrfJQVxw/edit)는 별도 사본이며 기존 파일/공유 권한을 바꾸지 않았다.
- [Ren’Py 시간 검사](evidence/non-audio-direction/native.log):실제 WASM 픽셀로 시작 대기·긴 지속 시간·4초 흔들림·인물ATL pause·동일 진입 시계·반복 활성/쉼·동작 줄이기를 확인했다. 최종 재빌드 결과는 [재실행](evidence/non-audio-direction/native-final.log)과 해당 폴더의 픽셀/JSON으로 구분한다.
- [형식](evidence/non-audio-direction/format-duration-green.log), [기존 형식 회귀](evidence/non-audio-direction/compatibility-regression-green.log):workbook6·이전5판 migration·0/미설정·음수/범위/잘못된 문자열 거부, 전체 기존작품/파일/XLSX/JSONB 왕복.

## 최초 실패와 수정

첫 전환UI 검사는 fixture 원본을 공식 파일로 감싸지 않은 테스트 오류로 실패했다. 공식 StoryDocument로 수정한 [재실행](evidence/non-audio-direction/transition-fixture-corrected.log)은 통과했다. 외부 UI 비교는 보호 사본의 새 작품ID를 원래 ID와 비교한 테스트 오류와 필요 없는 음원 unlock 검사를 수정했다. 처음 [로그](evidence/non-audio-direction/external-ui.log), [재실행](evidence/non-audio-direction/external-ui-rerun.log)을 남긴다.

독립 리뷰는 효과 취소의 작품간 기록 누출과 원래 없던 presentation{} 잔존을 발견했다. 작품ID+컷ID로 기록을 분리하고 absence까지 복원한다. 이 과정에서 형제 컴포넌트의 동일 React key가 UI 중복을 만들었으며 항목별 key를 분리했다. [최초 최종회귀 실패](evidence/non-audio-direction/ui-native-final.log), [수정 후 회귀](evidence/non-audio-direction/ui-native-final2.log). 이 최종 로그의 실제 결과만 완료 판정에 쓴다.

Transient ResizeObserver의 접힌 무대 크기를 Core 지원 비율 검사로 걸러 기존 layout 오류를 방지한다. 정상 비율·원고 좌표·엄격한 Runtime Core 검증은 유지한다. [추가 helper](evidence/non-audio-direction/final-helpers-green.log).

## 남은 완료 게이트와 한계

최종 회귀 로그의 완료와 실제 모바일/태블릿 화면 가독성 확인, 긴 확인형 전환의 실행/정상 해제는 완료 판정 전에 확인한다. 실기기Windows/Chromebook/Android와 보조기술, 실제 PostgreSQL/API, 원격 배포/릴리스는 이 작업에서 완료 주장하지 않는다. 실제 Google 시트 셀·형식·반출 검증과 Google UI의 시각 확인은 구분한다.

표정 variant·동적 배경pan/zoom·인물/효과 통합 타임라인은 [후속 목표](presentation-authoring-development-plan.md#후속-목표)에 상태·우선순위·의존성·완료 조건을 둔다. 현재 대사는 전체를 한 번에 표시하므로 with-dialogue를 글자 공개/완료 이벤트라고 주장하지 않는다.

## 최종 완료 검증 (2026-10-10)

[최종 회귀](evidence/non-audio-direction/ui-native-final2.log)는13개 통과/3개 타 프로젝트 제외다. PC1440·태블릿768·폰390/844에서 전체 저작 조작·취소·미설정 복원·작품간 취소 기록 분리·파일/reload·읽기 복귀를 확인했다. 실제 Excel/Google XLSX 재열기·전체 원고/Flow/Stage 비교와 동일 iframe의 Ren’Py 재생/편집 복귀도 통과했다. 기존 native 인물 배치·자유 위치drag·분위기/분기/복귀 회귀를 함께 실행했다.

[최종 단위/coverage](evidence/non-audio-direction/coverage-final.log):118개 파일/1113개 통과/1개 evidence 생성 제외. Statements93.55%, branches91.19%, functions96.80%, lines98.70%. [타입](evidence/non-audio-direction/typecheck-final2.log), [ESLint](evidence/non-audio-direction/lint-final.log), [Web 최종 빌드](evidence/non-audio-direction/web-build-final2.log), [문서 링크](evidence/non-audio-direction/docs.log), [Python presenter18개](evidence/non-audio-direction/presenter-unit.log) 통과.

[대상/범위 native](evidence/non-audio-direction/native-scopes.log)와 [실제 전환/ATL](evidence/non-audio-direction/native-transitions.log)이 통과했다. [긴 한국어 native 확인 전환](evidence/non-audio-direction/native-confirm/result.json)은 PC·폰세로·가로 제목/설명/버튼 픽셀을 보관하고, 확인 전 진행 잠금과 버튼 입력 후 presentationDone을 검증했다. [세로 화면](evidence/non-audio-direction/native-confirm/long-confirm-1560.png), [가로 화면](evidence/non-audio-direction/native-confirm/long-confirm-590.png). 스크린샷을 직접 확인해 한글 줄바꿈과 버튼 접근성을 점검했다.

우선 제작 범위는 완료다. 미래 표정/동적 배경시점/통합 타임라인, 물리 기기·스크린리더, 운영DB와 배포는 계획의 후속 목표다. 정확성4(whole-document/native 픽셀), 완결성4(우선 기능과 후속 기준), 명료성4(한글/초/그룹 대상), 실행가능성4(실제 앱/파일), 간결성4(계약·계획·검증 소유 분리), 평균4.0. 다음 개선은 실제 작가 관찰과 기기 검증이다.
