# 현재 compact 저작 회귀 이관

`authoring.spec.ts`의 다섯 시나리오는 실제 서재 생성/내 작품 카드, 현재 장·컷 이동, 추가 편집 목적, 등록 이미지 선택창, 작품 파일 메뉴를 사용한다. 기본 제공 판본의 편집 버튼은 새 보호 사본을 만들므로, 기존 편집본 복귀는 실제 내 작품 카드를 사용한다. 새로 만든 판본의 ID를 조회하기 위해 보이지 않는 예전 작품 선택 select를 사용하지 않는다.

선택지 상한/최소 선택지 삭제는 현재 디자인에서 해당 버튼이 없음을 확인한다. 새 컷 추가·순서 이동·임시 컷 삭제와 확인, 선택지 추가/삭제/새 갈래 연결 후 기존 선택 ID 보존은 실제 작업으로 유지한다. 등록 배경·인물은 매 컷 선택창 검색·적용을 거치며 실제 native 두 선택지의 물리 클릭은 Ren’Py가 보고한 choices rect에 맞춘다. iframe 영속성과 실제 영상의 색상 변화를 유지한다. 파일 재반입은 독립 작품 ID만 다르고 전체 project가 일치해야 한다.

손상 저장에서 이전 직접 작품 전환과 가져오기 적용을 허용하던 예상은 현재 원고 저장 보호 계약에 따라 의도적으로 폐기됐다. 새 검사는 손상 raw 원본, 현재 draft와 선택 컷을 유지한 상태로 파일 export를 수행하고 import preview를 확인한 뒤 적용을 시도한다. 적용은 저장 실패로 막히고 pending 확인창과 현재 초안이 유지돼야 하며, 취소 후 재export가 동일해야 한다. 서재로 돌아가기 자체는 현재 `returnToLibrary`가 메모리 초안을 기억하고 원본을 쓰지 않는 경로이며 허용된다. 파일 가져오기 적용은 `saveBeforeImport`가 정상 hydration과 저장 성공을 요구하므로 막힌다. 이전 숨은 작품 select를 통한 전환/unsafe import 예상은 이 서로 다른 절차로 분리했다. 건강한 기기 저장의 수동 재시도 검사는 별도로 유지한다.

RED 원본은 `red.log`다. 이관 중 실패 로그는 덮지 않는다: migration-1은 import 이후 작품 설정에서 현재 컷 복귀 누락, migration-2는 기본 제공 카드로 기존 내 사본을 여는 옛 예상, migration-3은 대본의 접힌 컷 정리 동선을 열지 않은 검사 오류다. 이는 제품 변경으로 우회하지 않고 실제 UI 경로로 고쳤다. migration-4는 실제 수정 timestamp까지 변경 전과 같다는 과한 예상, migration-5는 직접 editor 진입으로 개인 사본을 만들지 않은 옛 시작 경로, migration-6은 저장을 요구하지 않는 서재 복귀까지 막힌다는 과한 예상이다. 최종 결과는 이후 terminal 로그로 판정한다.


## 이번 이관의 terminal 결과

- `host-green.log`: exit 0, host 4 passed / native 목적의 기존 1 skip, 45.4초. 빈 작품/서비스 이미지/갈래/파일 재반입·reload, 구조 변경과 기존 개인 작품 재개방, 명시적 저장 재시도, 손상 raw·draft/pending import/cancel/export 보존을 확인했다.
- `native-green.log`: exit 0, native 1 passed / host 목적의 기존 4 skips, 11.0초. 두 선택지는 각각 실제 Ren’Py reported choices rect를 물리 클릭했다. 등록 이미지가 그려진 viewport의 색상 변화, 두 독립 엔딩, 동일 iframe, 읽기→현재 컷 편집 복귀와 전체 project 무변경을 확인했다.
- `native-migration-1-interrupted.log`는 구 semantic 다음 버튼의 pointer 경로 실행을 중단한 기록이며 성공으로 세지 않는다. 현재 다음 동선은 다른 current native 회귀처럼 focus+Enter를 사용하고 두 native 선택 클릭은 그대로 유지했다. `native-migration-2-server.log`는 중단 runner의 orphan server가 포트를 점유하고 응답이 비어 있었던 시작 실패다. exact owned server PID/command를 확인한 뒤 종료하여 다음 정상 실행이 가능했다.
- `lint.log`: focused ESLint exit 0. 제품 코드 수정·build·full suite 실행은 이 작업의 범위 밖이며, parent가 이후 최종 build와 결합 회귀를 수행한다. 물리 기기나 외부 앱·배포 검증 성공을 뜻하지 않는다.
