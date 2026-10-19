# 현재 compact UI 회귀 이어가기 — 2026-10-14

本紀錄使用目前工作樹和既有靜態 Web/native build。Excel ChatGPT 추가 기능 연결은 사용자 결정으로 제외한다. 새 음원 취득·시작 ZIP 편입·외부 업로드·별도 Web renderer를 추가하지 않는다. 작업 범위는 남은 UX-REGRESSION-NAV를 실제 현재 동선으로 검증하는 것이다.

## 기준 실행과 분류

`playwright --project=host --max-failures=8`은 당시383검사/81파일을 수집했다. [기준 로그](evidence/current-regression-2026-10-14/host-baseline.log)는74통과/4실패/2프로젝트 제외/1의도적 중단/302미실행이다. 확인된 실패를 수정·검증하기 위해 진행 중 실행을 종료했다. 전체 성공이 아니며 종료 중 연결 guid 오류와 BrokenPipe를 최초 Chrome 앱 오류의 원인으로 취급하지 않는다.

| 확인 항목 | 분류 | 이번 처리 |
|---|---|---|
| 새 개인 음원 업로드 검사 | 현재 정책에 따른 의도적 제외; 기존 회귀가 옛 허용을 기대 | 기존 기기 private 자료의 이름/속성/원본 보존과 새 첨부 거부, 등록 사본의 실제 왕복으로 이행 |
| CC0 소리·출처 선택 | 구현됨, 검사 경로 누락 | 소리 목적 선택·선택한 효과음의 필터/메타데이터·현재 읽기 메뉴로 이행 |
| 장·갈래 번호/컷 | 구현됨, 접힌 장 편집의 옛 경로 | 실제 보기/컷 목록 펼침과 전체 project 비교·파일/reload 유지 |
| 인물 구도·시점 | 구현됨, 세부 배치/썸네일 picker/읽기 복귀의 옛 경로 | 실제 등록 이미지 선택·대상/배치 입력과 native 픽셀/되돌림 보존 |
| 전체 기존 회귀 | 부분 구현/이행 P1 | 초기 미실행302개와 이후 collection384개를 전체 성공으로 합산하지 않음 |

## 실제 보존과 정책 검증

`existing-private-audio.ts`는 격리된 검사 브라우저의 **이전 Next 기기 저장 상태**와 IDB 두 store를 준비한다. 작품 파일의 새 private 첨부 허용 경로가 아니다. 기존 자료를 사용한 실제 편집에서 한글 이름·태그·원래 이름·원본 bytes·ID·목록 순서·전체 원고/Flow/Stage를 보존하고, 다른 cue의 선택 목록에는 private 자료를 새로 제공하지 않는다. 부분 취소도 확인한다. 원본 기존 자료를 공용 음원으로 자동 치환하지 않는다.

새 브라우저에 private 파일을 가져오면 확인창 전에 거부하고 기존 원고를 보존한다. 등록 자료로 명시적으로 만든 **검사용 사본**은 cue 참조만 바꿔 전체 파일을 왕복한다. 기본 공용 원음은 첨부하지 않는다. 기존 역사적 원본 fixture와 테스트 이행 전 소스는 증거 폴더에 보존한다.

기존 private 음악·효과음의 actual Ren’Py 재생은 source bytes가 있는 기존 기기 snapshot을 별도 브라우저에 복원해 확인한다. 장 진입/컷 진입·한 번 재생·연속 소리 유지, 같은 장면의 화면 크기/동작 줄이기 변경 시 중복 방지, 두 선택지/두 엔딩·되돌림/재선택·reload/재개·마지막 진입의 종료 중복 방지 및 편집 복귀를 유지한다.

이전 도안의4개 중복 좌우 Asset ID가 빈 값인 경우 기존 Domain constructor가 명시한 StageComposition에서 파생 ID를 계산한다. 전체 original 비교에서 **그4개 파생 값만** 복원해 같음을 확인하고, 현재 기기 저장/내보내기는 canonical project 전체와 비교한다. 원고·실제 배치/Asset ID·Flow·소리 참조·원본 fixture는 바꾸지 않는다.

## native 구도와 픽셀 기준

인물 없음/장 인물 상속/직접 배치, 여러 인물 추가/제거, 상대 크기·중앙·원본 방향, 배경 없음/1인칭과 파일 재열기를 실제 현재 UI로 수행한다. 미리보기 비율은 해당 viewport에서 세로/가로/PC를 실제 선택한다. 현재 휴대폰 편집의 자동 무대가16:9인 것을 창 비율만으로 세로 native라고 추정하지 않는다.

처음 픽셀 비교는 native 위에 초점으로 드러난 텍스트 접근 영역의 서로 다른 이전/다음 버튼 focus를 포함했다. 실제 두 캡처에서 이 차이를 확인하고 현재 컷 도착 및 revision 일치를 먼저 검사한다. 두 캡처의 초점을 같은 읽기 메뉴 버튼으로 옮겨 Web 접근 영역이 native 화면을 가리지 않게 한 다음, **크기와 전체 RGBA buffer의 완전 일치**를 그대로 확인한다. 비교를 느슨한 유사도·일부 영역으로 낮추지 않으며 접근성 스타일을 제거하지 않는다. 이 현상은 최초 Chrome 앱 오류의 원인 규명이 아니다.

## 현재 검증

최종 local 범위는 host8통과/의도적 native4제외, native5통과/의도적 host4제외다. 관련 단위44개/5파일·6패키지 타입 검사·관련 ESLint를 통과했다. 이번 변경은 검사 동선/fixture와 검증 문서이며 제품 UI·schema8/workbook8·Core/native 코드는 변경하지 않는다. 기존 빌드의 결과를 사용하며 새 Web/runtime build 실행을 주장하지 않는다. [host 후속](evidence/current-regression-2026-10-14/migrated-host-final.log), [최종 native](evidence/current-regression-2026-10-14/native-verified.log), [구도 native 보정](evidence/current-regression-2026-10-14/composition-native-fifth.log), [관련 단위44개](evidence/current-regression-2026-10-14/unit-current.log), [타입 검사](evidence/current-regression-2026-10-14/typecheck.log)에 각 실제 결과를 따로 남긴다. [최종 source/artifact manifest](evidence/current-regression-2026-10-14/final-manifest.json)가 이번 범위와 source hash를 기록한다. 과거 full-unit/다른 부분 성공 수를 이번 full-suite 성공으로 합산하지 않는다.

## 다음 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UX-REGRESSION-NAV 남은 collection | 부분 P1 | 현재 compact 도구/작품 메뉴·등록 picker·저장 guard | 현재384검사와 남은 native 대상의 assertion을 유지해 이행하고 실제 오류와 검사 설정을 구분 |
| 기존 private/구도 이행 | 구현됨·local 범위 검증 P1 | 기존 IDB·공통 파일·실제 Ren’Py | 현재 host/native 결과·전체 내용/원본·왕복·재개·복귀 증거 |
| UX-NATIVE-ERROR | 조사 P1 | 실제 Chrome 최초 예외 또는 재현 증거 | 원인 판정 및 필요한 수정/재현 회귀; 후속 성공만으로 해결 주장하지 않음 |
| UI-SAMSUNG/QA-DEVICE | 물리 기기 미검증 P2 | 실제 삼성 가상·물리 키보드/대상 기기 | 실제 조합·가림·회전·키보드/터치·접근성/성능 기록 |
| 새 외부 앱 편집/배포 | 별도 미검증 | 실제 외부 앱/운영 환경·기존 승인 범위 | local codec/browser/native와 분리한 실제 수정/저장/반출·배포 결과 |
| Excel ChatGPT 추가 기능 연결 | 의도적 제외 | 최신 사용자 결정 | 연결/로그인 요청을 반복하지 않으며 local 진행을 막지 않음 |
