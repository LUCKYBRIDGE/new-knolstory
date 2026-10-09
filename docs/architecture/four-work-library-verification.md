# 네 작품 중심 서재: 구현과 완료 검증

2026-10-09 목표는 분석이나 외형 수정에서 끝내지 않고, 기본 네 작품을 읽고 선택하고 내 사본으로 편집·꾸미고 기기/파일로 보관하는 로컬 경험을 연결하는 것이다. 비교 기준은 고정 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`와 과거 네 작품 서재 `906885d`다. 최종 서비스 1.0이나 M8/M9 서버·공개 출시 완료가 아니다.

## 수정 전후

| 영역 | 이번 작업 전 `9170572` | 최종 구현 |
|---|---|---|
| 기본 선반 | 원작 4권과 놀스토리 4권을 별도 책으로 표시 | 별주부전·옹고집전·선녀와 나무꾼·흥부와 놀부 네 권, 작품 안에서 판본 선택 |
| 연결 | 판본 카드의 읽기/편집/도구 | 안정적인 work ID→8개 실제 document ID, 선택한 판본의 원고·기록·슬롯·편집 위치 유지 |
| 원본 보호 | 선반 편집은 사본, 읽기 메뉴·작품 선택·흐름 수정에 보호 우회 경로 | 일반 진입의 모든 편집 경로가 원본을 보존한 독립 사본, 현재 읽던 컷 유지 |
| 가져온 기본 자료 | 기본 작품과 project ID가 같아 읽기 슬롯이 겹칠 수 있음 | 가져온 기본 자료만 project ID를 분리하고 안내; 내부 컷/Asset ID/Flow/표지/내용 유지, fork 전 중복 보호 |
| 내 작품 관리 | 새 작품/사본/파일 보관, 작품 삭제 UI 없음 | 사본 만들기, 삭제 확인, 최근 삭제 1권의 문서/작업 위치 복구, 재열기 |
| 좁은 책장 | 8권을 6권/2권 선반으로 이동, 빈 행 유지 | 2×3/6권 용량을 유지하되 기본 4권은 두 행만 사용; 내 작품이 늘면 같은 서랍 페이지 이동 |
| 숏스토리 | 별도 `/shortstory`, 한 작업 저장, 새 책/가져오기가 기존 작업을 대체 | 작품별 실제 원본 그림책 34쪽, 개인 사본·다중 보관·위치·삭제/복구·파일/A4 연결 |
| 숏스토리 읽기 화면 | 관리·파일 도구 뒤에 읽기 면 | 선택한 제목·삽화·글·쪽 이동이 먼저 보임; 도구와 보관함은 그 뒤 |
| 숏스토리 저장 실패/비동기 | 단일 작업과 늦은 응답의 덮어쓰기 가능 | 최신 목록에 응답 합치기, 목록 변경은 저장 성공 후 반영, 실패 초안 보존·전환 차단 |
| 빠른 읽기→편집 입력 | SDK canvas mouseenter가 배치 변경 때 Web textarea 포커스를 가져감 | bridge의 캡처 보호가 수동 hover focus 이동을 막음; native canvas 클릭/선택과 기존 runtime 유지 |

[수정 전 실행 snapshot](evidence/legacy-parity-audit-20261009/current-browser-baseline.json), [기능별 감사와 후속 목표](four-work-library-audit.md). 기존 목재·표지·대본·분기·자산·연출/오디오·Next 표 어댑터는 재사용했다. 두 번째 이야기 Web Stage, story-maker 수정, 레거시 저장소 자동 이전은 하지 않았다.

## 보존 계약과 원본 자료

- `BUILTIN_WORKS`는 표시 제목을 연결키로 사용하지 않는다. 네 work slug와 원작/놀스토리 document ID를 명시해 화면만 묶는다. 개인/가져온 책은 별도 항목이다.
- 여덟 fixture 파일의 수정 전후 SHA256이 전부 일치한다. 원문·전체 장/컷·Asset ID·Flow·StageComposition·문서 의미는 그대로다. [원고 보존](evidence/four-work-library/manuscript-preservation.json).
- ShortStory는 실제 고정 pack 네 파일 전체와 34개 삽화를 재사용한다. 원본 자료의 JSON 전체 일치를 대조했고, referenceText·scene identity·Asset ID를 v1 페이지로 투영했다. [자료/형식과 지원 한계](four-work-shortstory.md).
- 일반 UI는 기본 작품을 보호하지만 `/?view=editor`의 기존 개발/호환 fixture 편집 경로는 유지한다. 이 경로를 사용자의 기본 진입으로 안내하지 않는다. 이전에 저장한 사용자 배치/문구/편집을 자동 초기화하지 않는다.
- 가져온 기본 문서는 안내 후 project ID만 새로 부여한다. 독립 읽기 슬롯을 위한 명시적 identity adaptation이며, 이미 개인 ID를 갖는 작품의 파일 왕복은 전체 project가 정확히 일치한다. 기본 서재의 표지 제목 투영도 고정 표지/제목이 그대로인 경우에만 적용하며, 이전에 저장된 사용자 제목·표지 변경이 있으면 원문과 배치를 그대로 표시한다.

## 실행 검증

네 작품 각각에서 `책 선택→원작/놀스토리/숏스토리 읽기→서재`를 실제 버튼/링크로 검사했다. 판본 읽기는 책 표지를 거쳐 같은 실제 Ren’Py iframe으로 연결된다. 숏스토리는 Web/CSS만 사용한다.

원작 전체와 놀스토리의 두 대표 갈래를 실제 엔딩까지 읽었다. 원작 335컷 전부, 놀스토리 8경로의 1,767회 컷 진입, 총 2,102회 컷 진입이다. 놀스토리는 첫 갈림길의 첫 선택/다른 선택과 이후 첫 선택을 따라간 경로이며 **가능한 모든 조합이나 전체 분기 컷 전수 실행을 뜻하지 않는다.** 각 실제 컷의 글·무대 진입·음향·native 선택·지난 기록·슬롯·재시작/편집 복귀·파일 전체를 대조했다. [8원고 실행 로그](evidence/four-work-library/full-native-regression.log), 각 원고의 `full-score/*-native-reading.json`.

| 원고 | 실제 읽은 경로의 컷 수 |
|---|---|
| 선녀와 나무꾼 원작 / 놀스토리 | 83 / 336·335 |
| 흥부 원작 / 놀스토리 | 125 / 227·225 |
| 옹고집전 원작 / 놀스토리 | 71 / 168·170 |
| 별주부전 원작 / 놀스토리 | 56 / 153·153 |

여덟 판본에서 실제 읽은 line/path와 수동 슬롯 1을 저장하고, 다른 판본 읽기·새로고침 후 각각 그대로 불러왔다. 같은 iframe marker를 유지하며 서로 다른 8개 document ID와 work key를 확인했다. [판본 독립 실행 데이터](evidence/four-work-library/edition-resume-isolation.json).

원작 선녀와 놀스토리 흥부의 사본을 실제 UI에서 만들고 앞표지/책등/뒤표지·취소·적용·직접 글/그림 상자를 편집했다. 저장→reload→파일 내보내기→별도 browser context 가져오기→재내보내기에서 전체 project 일치를 확인했다. 흥부의 새 표지를 적용한 동결 입력 파일로 Chrome 정적 앱의 두 경로 227/225컷을 실제 엔딩까지 읽었다. [동결 native 입력](evidence/four-work-library/entry-cover/heungbu-native-input.knolstory), [해시·경로 기록](evidence/four-work-library/entry-cover/heungbu-native-reading.json). 실행 중 다른 테스트가 파일을 재생성하지 않도록 별도 입력을 동결했다.

네 숏스토리 각각에서 원본 모든 쪽의 실제 글·그림, 위치/reload, 사본 편집과 별도 context 파일 왕복을 확인했다. 표지 편집 재사용·쪽 추가/복제/이동/삭제 확인/되돌림·여러 책 전환·복구/재열기·Next Excel과 미지원 파일 거부를 검사했다. Google 가져오기 응답은 통제된 공개 TSV route로 검사했으며 실제 Google 계정/원격 시트 쓰기 승인이 아니다. Chromium A4 PDF는 10/10/12/10쪽이고, 각 본문 페이지에 원래 글 전체와 삽화가 있으며 A4 치수를 대조했다. [인쇄 데이터](evidence/four-work-library/shortstory/print-verification.json). 실제 종이 프린터 검증은 아니다.

## 실패를 재현해 수정한 항목

1. v1 JSON envelope의 추가 자료가 조용히 버려질 수 있던 경로를 strict keys로 거부했다. v2/관련 없는 표 행·셀도 중단한다.
2. 지연된 공개 Google TSV 응답 동안 만든 책/글이 사라지는 것을 RED로 재현했다. 응답 시점 `latest.current`에 합치도록 수정해 신규 책과 글의 reload 보존을 확인했다.
3. 그림책 삭제 저장 실패 후 편집 내용이 보관함에 포함되지 않는 것을 RED로 재현했다. 목록 변경을 성공 후 게시하고 본문 초안은 실패 시 메모리에 보존해 재저장을 확인했다. [RED](evidence/four-work-library/shortstory-storage-red.log), [GREEN](evidence/four-work-library/shortstory-storage-green.log).
4. Chrome 정적 앱의 read→copy-edit textarea 입력이 사라져 포커스/입력 이벤트를 추적했다. 실제 SDK의 `mouseenter→window.focus()`가 원인이었다. bridge capture guard의 두 검사 RED→GREEN과 actual Chrome 입력/저장 보존, 기존 canvas 클릭/선택을 검증했다. [bridge RED](evidence/four-work-library/focus-bridge-red.log), [bridge GREEN](evidence/four-work-library/focus-bridge-green.log), [실제 입력/저장](evidence/four-work-library/focus-input-after.log).
5. 사본 생성 직후 이전 저장 완료 표시가 잠깐 남던 문제를 저장 대기로 표시했다. 검사도 실제 새 work key와 저장된 문장을 기다리고 비교한다. 단순 DOM 기대값 수정으로 원고 보존을 대신하지 않는다.

## 검사 범위와 결과

최종 숫자와 GitHub 결과는 [완료 감사](evidence/four-work-library/completion-audit.json)에 모은다. 단위/계약/통합 847개, 설정된 TS package/web lib coverage는 statements93.34%, branches90.68%, functions95.32%, lines97.59%로 80% 기준을 충족한다. React/Python 전체 coverage라고 주장하지 않는다. 전체 정적 host 93개와 최종 catalog/표지 29개, 실제 Chrome 정적 native/DPR 7개가 통과했다. Python 준비 도구 24개, 타입·린트·runtime/static build, production dependency audit, 1351개 미디어 해시 검증을 별도로 수행했다.

Chrome/Chromium browser viewport로 PC·태블릿·휴대폰 가로/세로와 320px, 서재의 책/선반 접촉·목재/전경·표지 글의 가독성·집중 창/초점/키보드를 확인했다. 원본 그림을 포함한 PNG/PDF는 로컬 evidence에 보관하고 Git에 공개하지 않는다. 대표 화면은 `shelf-*`, `focus-*`, `shortstory/reading-first-phone.png`, `shortstory/*-reader.png`와 `*-print-*.png`다.

코드 검토자는 비동기/실패 저장의 두 결함을 지적하고 수정 뒤 재검토했으며, runtime 포커스·ShortStory modal 변경의 최종 검토에서 추가 구체적 결함을 발견하지 않았다. 실제 브라우저 결과는 검토자의 추정과 분리해 root 실행 로그로 기록한다.

## 재현과 GitHub

```sh
pnpm env:prepare --legacy ../story-maker
pnpm env:doctor
pnpm preview
```

`http://127.0.0.1:3000`에서 서재와 세 판본을 고른다. 기존 권한 있는 고정 legacy checkout이 필요하다. 다른 컴퓨터 안내는 README와 [재현 환경](reproducible-test-environment.md)을 따른다. `pnpm env:verify`는 새 네 작품/그림책과 판본 독립 native 경로, 새로 만든 표지 사본의 native 검사도 포함한다.

브랜치는 `codex/book-entry-cover`, PR은 [#1](https://github.com/LUCKYBRIDGE/new-knolstory/pull/1)이다. 공개 GitHub CI는 private binary corpus 없이 source/type/lint/build와 catalog binary 검사를 제외한 coverage를 실행한다. 로컬 full corpus/native 결과와 소스 CI를 구분한다. push 후 새 구현 커밋 및 최종 PR head CI를 각각 확인하며, 이전 커밋 성공을 이번 head 성공으로 대체하지 않는다.

## 제한과 후속

서버/계정/온라인 저장/학급/과제/제출/공개 권한, 과거 revision checkpoint·다중 탭 충돌, v2 활동 문서·구형 Excel, 실물 학교 기기/스크린리더, 공개 media release는 [후속 목표](four-work-library-audit.md)의 의존성과 종료 조건으로 남긴다. 미확인 미디어의 공개 배포 차단은 유지한다. 서비스 도메인에 배포하거나 main으로 병합하지 않았다.

자체 평가(`agent-self-evaluation`): 정확성4/5(원고 해시·실제 native·PDF를 대조, 물리기기 제외), 완결성4/5(요청한 로컬 흐름과 후속 목표를 연결, v2/서버 기능은 제한 명시), 명확성4/5(이전 snapshot·실패·최종 결과 분리, 근거 문서가 길어 색인 제공), 실행 가능성4/5(현재 로컬/파일 왕복과 재현 명령, 권한 있는 legacy 자산 필요), 간결성4/5(한 검증 문서와 별도 감사/형식 계약으로 구분). 평균4.0/5. 사용자가 현재 네 책·사본·그림책과 기록/파일을 직접 확인할 수 있는지를 최종 기준으로 삼았다.

## GitHub 구현 커밋 확인

구현 커밋 `327b142d8edd44ca9341a0e33837c71938d3e3c8`을 `codex/book-entry-cover`에 push하고 PR #1의 제목/본문을 최종 경험·검증·제한에 맞춰 갱신했다. 새 구현 head의 두 CI check가 모두 SUCCESS이며, source subset 845개·24 Python·production audit·타입·린트·정적 build가 통과했다. private catalog binary test는 제외했고 로컬 847개와 구분한다. [정확한 구현 head/CI 기록](evidence/four-work-library/github-delivery.json), [최신 PR checks](https://github.com/LUCKYBRIDGE/new-knolstory/pull/1/checks). 이 기록 커밋의 새 head CI도 push 후 별도로 확인한다.
