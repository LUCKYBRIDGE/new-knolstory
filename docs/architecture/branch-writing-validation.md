# 새 갈래 작성과 원래 컷 복귀 — 2026-10-13

[계승 UX 계획](legacy-editor-ux-improvement-plan.md)의 UX-BRANCH-WRITE를 이어간다. [승인 UI](approved-ui-development-plan.md), [편집 방문 계약](editor-flow-context-validation.md), [저장 계약](authoring-storage-contract.md)이 기준이다. 새 도안/음원·파일 버전을 만들거나 구 저장소를 변경하지 않는다.

## 실제 변경

이전에는 미연결 선택지에 새 장을 연결하면 새 컷은 선택되지만 선택지 도구가 계속 열려 있었고 생성 이동은 편집 방문에 기록되지 않았다. 현재 ‘선택지 N에 새 장 연결’은 작은 ‘새 갈래 작성’ 대화상자에서 원래 컷·선택 문구와 영향을 보여 준다. 취소/Escape는 원고·연결·기기 저장을 변경하지 않는다. ‘새 갈래 만들고 글쓰기’는 저장 guard를 통과한 뒤 생성 문서와 도착 컷/편집 방문을 함께 저장하고 기본 글 도구로 이동해 빈 해설 입력에 초점을 둔다. 기본 화면에 버튼/패널을 더하지 않는다.

생성은 기존 `createStoryChoiceChapter` 계약을 재사용한다. 미연결 선택지 하나의 ID/문구/조건/점수 효과를 유지하면서 새 도착 컷을 연결한다. 다른 선택지·기존 컷의 글/Asset ID/배치/연출·장 자료는 유지한다. 새 컷은 현재 배치와 장 자료를 이어받으며 본문/컷 소리는 빈 상태로 시작한다. 새 장을 기존 끝 뒤에 추가할 때, 기존 마지막 컷이 순서대로 진행하던 경우에만 기존 마지막을 명시적인 이야기 끝으로 만든다. 기존 원고가 새 갈래로 의도치 않게 이어지는 것을 막는 기존 도메인 동작이며 이번 대화상자에서 적용 전에 알린다. 기존 goto/ending/조건 경로·합류 대상을 임의 변경하지 않는다.

저장 실패/한글 조합/현재 원고·작품 변경이 있으면 생성 문서를 적용하지 않고 현재 컷/원고와 pending 내용을 유지한다. 실패 대화상자에서 재시도하거나 취소할 수 있다. 실제 원래 선택지 컷→새 컷 방문을 기록해 새로고침 후 ‘현재 컷 연결 살펴보기’의 이전 편집 컷 복귀로 돌아온다. 독자 읽기에서 돌아온 컷이 이전 편집 경로 끝과 다르더라도 생성의 실제 원래 컷을 먼저 기록한다. 독자 playback.path/점수·선택 기억을 편집 경로로 복사하지 않는다.

## 저작·형식 경계

StoryDocument7/archive2/workbook7/JSONB payload1/RuntimeScene 계약은 유지한다. 순수 draft helper는 원본 프로젝트를 변경하지 않고 생성 문서와 별도의 UI 방문을 반환한다. 작품 파일/workbook/XLSX/JSONB에는 문서만 보관하며 pending/편집 방문 상태는 넣지 않는다. Core가 실제 선택과 연결을 해석하고 단일 Ren’Py가 재생한다. `.rpy` 저작이나 별도 Web renderer를 추가하지 않는다.

## 이번 증거

- [단위 RED](evidence/branch-writing-current/unit-red.log), [UI RED](evidence/branch-writing-current/ui-red.log): 생성 draft/확인·글쓰기 동선이 없는 이전 상태를 확인했다.
- [첫 단위](evidence/branch-writing-current/unit-first.log)의 workbook Promise 처리 오류를 수정한 [GREEN](evidence/branch-writing-current/unit-green.log). 원본 불변·선택/기존 후속/배치·전체 archive/workbook/XLSX/JSONB 왕복을 확인한다.
- 읽기 복귀 후 실제 생성 origin 기록의 [RED](evidence/branch-writing-current/origin-red.log)를 추가했고 [최종 단위](evidence/branch-writing-current/unit-final.log)4개가 통과했다.
- [첫 정적 native](evidence/branch-writing-current/ui-first.log)5개:1440/768/390/844의 취소→만들기→빈 글 초점→한국어 작성→저장/reload→원래 컷 복귀→native 선택/읽기/편집 복귀→파일 재반입, 저장 실패 후 retry.
- 원래 컷의 미변경 모든 필드까지 전체 비교와 조합 guard, 읽기 복귀 후 origin을 보강한 [최종 실제 UI](evidence/branch-writing-current/ui-final.log)는 실행 결과를 아래에 확정한다.

기존 creation caller의 회귀도 새 생성 동작을 적용하도록 업데이트했다. `reading-surface`의 갈래 identity 검사는 현재 서재/선택 도구/컷 목록으로 이행해 따로 실행한다. `authoring`/`creative-reading-journey`는 생성 확인만 적용했고 파일의 다른 옛 경로/개인 업로드 가정은 아직 별도 회귀 이행 대상이다. 일부 caller의 수정으로 전체 suite 통과를 주장하지 않는다.

## 범위와 다음 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UX-BRANCH-WRITE | 구현·이번 범위 검증 완료 P2 | 도메인 미연결 선택 생성·기기 save/IME guard·편집 방문 | 취소/저장 실패/retry·원래 컷/새 글 초점·기존 후속/배치/문서 전체·파일/표/JSONB·native 선택/복귀 |
| 갈래 한정 연출 실행 | 남음 P1 | cue identity·실제 선택 경로 조건·현재 종료 범위 계약 | 작가가 선택한 갈래에서만 효과/연속 소리 적용, 우회/합류/반복과 전체 형식/native 검증 |
| AU-01 여러 컷 복사 | 부분 구현 P2 | 범위 ID remap·외부 연결·취소 | 기존 계획의 전체 완료 조건 유지 |
| 실제 외부 앱·물리 삼성 입력 | 이번 실행 미검증 P2 | 실제 앱 세션/장치 | 새 외부 앱 저장·반출 및 OS 조합/가림/하드웨어키보드·회전/터치 검증 |

서버/온라인 서비스·배포·최초 Chrome 오류 원인은 이 생성 UX 개선으로 완료하지 않는다. 음원530/별칭23·현재 장면 on-demand와 기존 private/Pixabay14 정책은 그대로다.

## 최종 결과

[현재 정적 native16개](evidence/branch-writing-current/ui-final.log)는 새 갈래6개·편집 방문5개·비음원 연출5개를 모두 통과했다. 확인창 bounds·취소 초점과 한국어 줄바꿈을 보강한 [최종 생성6개](evidence/branch-writing-current/visual-final.log)도 통과했고, [기존 갈래 표시1개](evidence/branch-writing-current/branch-identity.log)가 통과했다. [휴대폰 확인](evidence/branch-writing-current/confirm-phone.png)·[휴대폰 작성](evidence/branch-writing-current/writing-phone.png)·[가로 확인](evidence/branch-writing-current/confirm-landscape.png)을 별도 보존한다. 기본 글/추가 도구와 같은 스타일을 쓰며 창 높이/너비를 넘기지 않는다. viewport/합성 composition 결과를 실제 삼성 OS keyboard로 확대하지 않는다.

[전체 단위/coverage](evidence/branch-writing-current/coverage.log):148파일,1213통과·기존 artifact 생성1건 제외, statements93.72%/branches91.21%/functions96.67%/lines98.70%. [타입6 workspace](evidence/branch-writing-current/typecheck-final.log), [변경 파일 lint](evidence/branch-writing-current/last-lint.log), [최종 Web build](evidence/branch-writing-current/build-final.log), [문서 링크](evidence/branch-writing-current/docs-final.log) 통과. 독립 read-only 리뷰에서 P1/P2 지적은 없었다. 리뷰 후 읽기 복귀 origin 경계는 별도 RED→단위4개/native6개로 추가 확인했다.

UX-BRANCH-WRITE는 구현·이번 범위 검증 완료 P2다. 소스·실행 hash는 [manifest](evidence/branch-writing-current/final-manifest.json)에 보관한다. 이전 이어가기 manifest는 당시 기록으로 유지한다. 음원 취득/등록/bytes·시작ZIP·Core/Ren’Py 엔진 코드를 수정하지 않았다. 실제 외부 Excel/Google 앱의 새 편집·물리 기기·서비스·배포 검증은 별도다.

자체 점검: 정확성4(전체 저작형식·native·origin 확인, 외부앱/실기기 제외), 완결성4(새 갈래 쓰기/취소/실패·원고/복귀 완료, 갈래 한정 연출/전체 기존 회귀 후속), 명료성4(기존 끝 보호와 변경 범위 표시), 실행 가능성4(현재 UI/save/IME/native·문서 연결), 간결성4(기본 화면 확장 없이 선택 작업의 확인만 추가), 평균4.0. 다음 작업은 갈래 한정 범위 계약과 외부 앱/기기 검증이며 전체 목표는 유지한다.
