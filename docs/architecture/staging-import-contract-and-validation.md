# 다른 컷 배치 가져오기

2026-10-11. [승인 개편](approved-ui-development-plan.md)과 [구 놀스토리 계승](legacy-editor-ux-improvement-plan.md)의 UX-STAGING을 실제 편집기로 연결한다. 배경·인물 편집 안에서 필요할 때만 여는 대화상자로 제공한다. 글 중심 기본 화면을 확장 패널로 채우지 않는다.

## 동작·보존 계약

원본은 현재 컷과 다른 컷을 선택한다. 기본 선택은 이전 원고 컷이며 처음 컷에서는 다른 첫 컷이다. 적용 대상 장·컷·글과 원본 장·컷·글을 함께 표시한다. 배경·인물 자료 그림은 catalog 썸네일이다. 별도 Web 장면 미리보기나 player로 만들지 않으며 적용 결과는 기존 단일 Ren’Py에서 확인한다.

- 배경: 원본에서 현재 해석되는 컷→장→작품 기본 이미지를 구체적인 ID로 가져온다. 원본이 그림 없음이면 대상도 그림 없음이다. 대상의 배경 구도/효과는 유지한다.
- 인물: 원본의 해석된 StageComposition 위치·크기·방향·깊이·자료/인물 키를 복제한다. 현재 인물 배치를 교체한다고 알린다. 등장·퇴장·이동 motion은 별도 checkbox이며 기본적으로 가져오지 않는다.
- 화자: 대상의 글 종류·speaker·speakerName을 유지한다. 대상의 기존 speaker actor key가 새 인물에 존재하면 유지하고, 없으면 대상의 왼쪽/오른쪽 화자에 맞춘다. 원본의 말하는 인물을 자동으로 대상 화자로 복사하지 않는다. 인물 대상 효과와 화자 연결은 새 인물에서 확인하도록 안내한다.
- 원고·선택지·점수·소리·화면 효과·메모는 유지한다. 적용 전 선택과 취소는 원고를 바꾸지 않는다. helper는 기존 `patchStoryLine` validation과 immutable 객체를 사용한다.
- 한 번 되돌리기는 적용한 필드만 원래 값/미설정 상태로 복구한다. 적용 후 고친 글·연출 등 다른 필드는 유지한다. 가져온 배경/인물을 다시 수정했거나 다른 작품/컷이면 이전 snapshot으로 덮어쓰지 않는다.

Core helper `staging-import.ts`가 선택적 필드 변경을 만들고 Web은 요청·원본 참고·취소/오류를 담당한다. 기존 StageComposition·backgroundMode·motion 필드라 새 StoryDocument/workbook/JSONB 버전을 만들지 않는다. 현재 형식의 기존 검증과 파일/표 어댑터를 사용한다. 실제 데이터베이스나 이번 실행에서 실제 Google 앱을 다시 편집한 결과로 표현하지 않는다.

## 검증

[RED](evidence/staging-import/red.log), [단위/전체 작품 왕복](evidence/staging-import/unit-final.log): 그림 없음·직접 위치·동작 포함/제외·배경만 선택·입력 오류·stale undo·이후 글 보존·archive/workbook/Excel/JSONB 전체 의미 일치. [UI4개](evidence/staging-import/e2e.log):1440/768/390/844에서 선택→취소→적용→글 수정→되돌리기→재적용→저장→재열기→파일 반출→실제 native 읽기→편집 복귀. 대화상자 화면 경계와 입력 접근 포함.

[최종 빌드](evidence/staging-import/build.log), [정적 빌드 검사](evidence/staging-import/static-final.log), [전체 coverage](evidence/staging-import/coverage.log), [타입](evidence/staging-import/typecheck-final.log), [lint](evidence/staging-import/lint.log). 기존 상단/컷 화살표 검사를 최종 정적 빌드에서 함께 실행한다. 삼성 실기기/보조 기술 검증은 기존 후속 목표로 구분한다.

작은 경로 맥락·관련 창작 메모·갈래 작성 동선과 전체 승인 이미지의 아직 미검증 기능은 [계승 계획](legacy-editor-ux-improvement-plan.md)과 [STATUS](../../STATUS.md)에 남긴다. 이번 배치 가져오기만으로 전체 활성 목표를 완료하지 않는다.

전체 coverage 재실행은129파일/1150개 통과·기존1개 skip, statements93.50%/branches91.10%/functions96.75%/lines98.67%였다. 첫 동시 검사에서 큰 작품의 Excel 왕복이 기본5초 한도를 넘었다. 원고 assertion을 바꾸지 않고 이 전체 형식 검사만30초 한도로 분리한 후 재실행했다. [첫 coverage](evidence/staging-import/coverage.log), [최종 coverage](evidence/staging-import/coverage-final.log). 기본 host/stories-runtime testMatch에는 새 spec이 포함되어 기본 검사에서도 빠지지 않는다.

최종 정적 빌드9개 검사와 체크박스 inline 보완 후4개가 통과했다. 작품/컷별 알림·undo를 묶은 최신 소스는 [최신 빌드](evidence/staging-import/build-current.log)와 [최신4화면 검사](evidence/staging-import/current-final.log)에 기록한다. 원본/대상 label·checkbox·footer가 같은 dialog에서 접근 가능하며 자세한 본문은 해당 영역만 스크롤한다. [최종 타입](evidence/staging-import/typecheck-final.log), [최종 lint](evidence/staging-import/lint-final.log), [문서](evidence/staging-import/docs.log).

자기 점검: 정확성4(기존 필드·전체 equality/native 왕복), 완결성4(적용/취소/undo·저장/재열기4화면, 실기기 별도), 명료성4(원본/대상/항목·메모/실제 motion 구분), 실행 가능성4(현재 편집 UI에 연결), 간결성4(기존 도구·형식 재사용), 평균4.0. 후속은 특정 갈래/효과 범위와 연결 메모를 같은 원고 중심 작업면에서 검증하는 것이다.
