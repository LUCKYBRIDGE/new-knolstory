# 네 작품 숏스토리: 원본 읽기와 내 그림책 보관

2026-10-09 네 작품 중심 서재 목표의 Web/CSS 그림책 경로다. 놀스토리의 장·컷을 재생하는 별도 Web Player가 아니며 Runtime Core나 Ren’Py로 그림책을 변환하지 않는다(ADR 0009).

## 자료 기준과 지원 형식

고정 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`의 `app/shortstory/packs/*-classic.v1.json` 네 파일 전체를 `packages/compatibility/src/shortstory-originals-data.json`에 보존했다. 별주부전 8쪽, 옹고집전 8쪽, 선녀와 나무꾼 10쪽, 흥부와 놀부 8쪽이다. 새 줄거리를 쓰지 않고 각 장면의 `referenceText`, 제목, `sourceSceneId`, 삽화 Asset ID를 현재 strict v1 page 모델로 투영한다. 질문·삽화 revision·출처 문구를 포함한 전체 pack은 원본 데이터에 남는다. 34개 그림은 이미 복원되는 고정 421개 공통 자산에 포함되어 별도 미디어나 이야기별 엔진 패키지를 추가하지 않는다.

이 pack의 이름 `v1`과 학생 작업용 `.shortstory` version은 다른 계약이다. 고정 레거시에는 v1 정적 페이지 자료와 후속 v2 activity/scene 문서가 공존한다. 현재 Next는 정적 페이지 v1 `.shortstory`와 Next Excel/TSV 공통 표를 지원한다. **v2 학생 활동 문서의 question/answer/layout/art revisions를 읽고 편집하는 호환 어댑터는 미구현**이다. 원본 pack을 읽을 수 있는 그림책으로 투영한 것이 모든 v2 작업 파일을 지원한다는 뜻은 아니다.

지원하지 않는 version, envelope 추가 자료, 음악/연출 필드, 잘못된 자산, 중복 쪽 ID, 관련 없는 표 행과 지원하지 않는 셀은 가져오기를 중단한다. 사용자가 작성한 지원 범위 밖 자료를 버린 뒤 성공으로 표시하지 않는다. 구형 레거시 4탭 Excel과 Google 계정 writeback은 별도 후속 목표다. 현재 공개 Google 시트는 Next 단일 탭 TSV만 일회성 읽기이며 원격 수정·계정 인증을 하지 않는다.

[고정 자료 전체 일치와 투영 범위](evidence/four-work-library/shortstory/source-preservation.json), [엄격한 형식 검사](../../packages/compatibility/tests/shortstory-library.test.ts).

## 연결과 원본 보호

서재에서 `별주부전/옹고집전/선녀와 나무꾼/흥부와 놀부 → 숏스토리 읽기`는 `/shortstory/?work=<rabbit|onggojib|seonnyeo|heungbu>&mode=read`로 실제 해당 원본을 연다. 원본 ID는 `shortstory-original-<work>`이고 개인 보관 목록에 원본을 복사 저장하지 않는다. 원본 글·제목·그림은 읽기 전용이다. `내 사본으로 쓰기`는 독립 프로젝트/쪽 ID의 개인 그림책을 만들어 편집한다. 주소의 `mode=edit`를 직접 사용하는 경우에도 사본을 만들고 query를 소비하여 reload마다 새 사본을 만들지 않는다.

개인 그림책의 제목·지은이·표지와 쪽 글/그림을 편집하고, 추가·복제·순서 이동·삭제 확인·쪽 삭제 되돌리기를 제공한다. 삭제 확인은 취소 우선 초점·Escape·Tab 경계와 원래 버튼 복귀를 가진 native modal이라 확인 중 다른 쪽을 삭제 대상으로 바꿀 수 없다. 표지는 기존 앞표지·책등·뒤표지 편집기와 `cover.design`을 메타데이터 adapter로 재사용한다. 적용/취소와 파일 왕복에서 같은 표지 모델을 유지하며, 학생이 저장한 자유 배치나 문구를 임의로 정돈하지 않는다.

`그림책 보관함`은 네 원본, 여러 내 그림책과 삭제한 그림책 복구를 한 목록에서 제공한다. 새 작업과 가져오기는 기존 책을 덮어쓰지 않고 독립 책을 추가한다. ID가 같은 파일은 새 ID로 분리해 원본을 보호한다. 페이지 위치는 책 ID별로 저장한다. 편집 화면에서 읽기로 전환할 때 현재 쪽을 유지하며 전체 쪽 목록에서 첫 쪽을 선택할 수 있다.

## 저장·실패·복구

새 저장은 `knolstory-shortstory-library-v1`이다. 기존 Next 단일 작업 `knolstory-shortstory-workspace-v1`은 읽어 개인 책을 추가하되, 원래 bytes와 `-backup`을 모두 보존한다. 레거시 `storygame*`나 `nolstory-workspace-v1` IDB는 읽거나 변경하지 않는다. 손상된 새 보관함은 그대로 보존하고 자동 덮어쓰기를 차단한다.

편집 초안은 저장 실패 중에도 메모리에 남고 파일로 보관할 수 있다. 기기 저장 실패 시 새 책/가져오기/전환을 중단하여 기존 초안을 유지한다. 삭제·복구·새 책 추가 같은 목록 변경은 저장 성공 후 화면에 반영한다. 비동기 파일/시트 응답은 응답 시점의 최신 보관함에 합쳐, 가져오기를 기다리는 동안 만든 책과 수정한 글을 보존한다. pagehide/beforeunload에서 최신 상태를 다시 저장하며 실패 초안이 있을 때 떠나기 경고를 제공한다. 이것은 로컬 단일 브라우저 작업 흐름이며 서로 다른 탭에서 동시에 편집한 변경을 병합하는 협업 기능은 아니다.

## 파일과 A4 인쇄

`.shortstory` JSON 파일, Next Excel, TSV는 동일 페이지/표지 구조를 왕복한다. 별도 browser context로 가져온 사본은 저장·reload·읽기까지 전체 project 일치로 검사한다. 그림 Asset ID는 유지하며 권한 있는 테스트 기기의 공통 자산을 사용한다. 미확인 그림을 파일에 내장하거나 공개 재배포하지 않는다.

A4는 Web/CSS 인쇄로 표지, 각 그림/글 쪽, 마지막 인사를 출력한다. Chromium print-to-PDF 결과는 별주부전 10쪽, 옹고집전 10쪽, 선녀와 나무꾼 12쪽, 흥부와 놀부 10쪽이다. 각 본문 쪽에 해당 원래 글 전체와 삽화가 들어 있고 A4 치수를 확인했다. 실제 종이 프린터·학교 하드웨어 출력 검증으로 주장하지 않는다. 생성 PDF와 화면은 미확인 그림을 포함하므로 Git에는 공개하지 않고 로컬 evidence에만 둔다.

[실제 PDF 텍스트/삽화/치수 검증](evidence/four-work-library/shortstory/print-verification.json), [단일 작업 보존·중단 검사](evidence/four-work-library/shortstory/migration-contract.json). 최종 전체 검사·검토·GitHub 결과는 [이번 목표의 완료 근거](four-work-library-verification.md)에 기록한다.
