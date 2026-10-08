# 놀스토리 소개·서재·책 디자인 계승

## 목표와 소유자 승인

사용자는 기존 story-maker의 소개 화면·서재·책 표지 디자인과 시스템을 직접 재사용해도 된다고 승인하고, Next에서 기존 수준의 품질과 완성도를 요구했다. 2026-10-08에는 놀퀴즈·놀스토리·story-maker의 저작권자가 사용자 본인이며 계속 작업하라고 명시했다. 기존 프로젝트 디자인과 자료를 소유자 허가 아래 직접 활용했다.

기준은 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`다. `StartScreen`, `StoryDiscovery`, `BookCover`, `BookCoverCanvas`, `BookCoverEditor`, `CoverDesignFace`, 관련 global CSS와 책 디자인 문서를 읽었다. 레거시 checkout은 읽기 전용으로 사용하고 이미 있던 다른 로컬 수정은 건드리지 않았다.

## 분류와 구현

| 영역 | 분류 | Next 적용 |
|---|---|---|
| 포스터형 소개와 이야기 전환 | PRESERVE/REFINE | 네 작품을 바꿔 보는 큰 소개 무대, 기존 여덟 책, 서재·읽기·숏스토리 진입 |
| 따뜻한 방·목재 서가·책 중심 탐색 | PRESERVE/REFINE | 실제 고정 방/선반/식물 자료, 큰 책 표지, 원작/놀스토리/내 작품/가져온 작품 분류 |
| 선택한 책의 집중 화면 | PRESERVE/REFINE | 큰 양장본·받침대·소개, 좌우 책 탐색, 읽기/이어읽기/준비/편집, Escape·초점 복귀 |
| 서재의 분류·페이지·복원 | REFINE | 한글 제목/지은이 검색, 8권 단위 페이지, 현재 탭의 필터/검색/페이지 복원, 기존 저장과 분리 |
| 양장본 표지와 판본 표식 | PRESERVE/REFINE | 공통 BookCover에 책등·페이지 단면·마감, front/spine/back과 판본 표시 |
| 표지 직접 제작 | PRESERVE/REFINE | 실제 프리셋 미리보기, 세 면 상자/기본 제목·인물·배경 직접 이동·크기 조절, 44px 손잡이·방향키·수치 대안 |
| 기존 global CSS/레거시 imports | REBUILD | 현재 CSS Module, story-domain, asset-registry와 cover resolver 경계에 맞춰 이식 |
| 작은 표지와 설명 중심 카드·중복 표지 해석 | RETIRE | 긴 설명은 집중 화면에서 읽으며 모든 정적 책 표면은 같은 renderer/model 사용 |

레거시의 계정·공유 서버와 ShortStory provider는 복사하지 않았다. 현재 Next의 로컬 작품 분류와 기기/파일 보관을 유지하며 숏스토리는 기존 Web 경로로 연결한다. 이야기 장면은 여전히 Runtime Core가 해석하고 Ren’Py만 렌더한다. 표지 UI가 두 번째 이야기 player로 확장되지 않는다.

## 사용 흐름

1. 첫 방문의 포스터 소개에서 대표 이야기를 바꾸거나 서재로 들어간다. 재접속·reload 규칙은 기존 구현대로 유지한다.
2. 서재의 큰 책을 누르면 집중 창이 열린다. 좌우 버튼/방향키로 다른 책을 보고 Escape로 닫으면 선택했던 책으로 초점이 돌아간다.
3. 읽기와 이어읽기는 저장된 책 표지를 거쳐 실제 Ren’Py로 연결된다. 작품 준비·편집은 기본 작품의 보호된 내 사본 또는 기존 내 작품으로 연결된다.
4. 표지 편집에서 같은 작품의 프리셋을 실물 미리보기로 비교하고 세 면을 선택한다. 선택 영역/44px 손잡이를 끌거나 방향키·숫자로 조절한다.
5. title과 cover는 하나의 초안 되돌림 기록이다. 드래그 한 번은 하나의 기록이며 pointer cancel·취소는 적용 전 데이터로 돌아간다. 적용은 기존 저장/파일 계약을 사용한다.
6. 분류·검색·선반 페이지는 `knolstory-library-view-v1` 탭 설정이다. StoryDocument/작품 파일이나 레거시 저장소에 섞이지 않는다.

## 재현과 자료 복원

기존 재현 환경을 그대로 사용한다.

```sh
pnpm env:prepare --legacy ../story-maker
pnpm env:doctor
pnpm preview
```

원래 421개 작품 자산에 더해 방·선반·식물 세 파일을 고정 커밋에서 SHA256 대조 후 복원한다. `packages/asset-registry/src/legacy-ui-media.json`에 정확한 source path, 해시와 소유자의 재사용 허가를 기록했다. 이 자료는 Web의 서재 장식이므로 Ren’Py game/assets에 복사하지 않는다. 복원된 binary와 생성 runtime은 기존 local-restore 방식으로 관리하며 서비스 배포는 이번 작업에 포함하지 않는다.

## 실제 검증

- TypeScript 단위/계약/통합 **803개**, Python 준비 도구 **24개**, 타입·린트·정적 build·production audit·미디어 **1344개** 해시 검증 통과. 구성된 TS coverage: statement **92.92%**, branch **89.33%**, line **97.48%**. React/Python 전체 coverage로 주장하지 않는다.
- 전체 정적 host 회귀 **59개** 통과, 반대 native 경로 **26개** skip. 마지막 글자 크기·modal 키보드 보완 뒤 원작/놀스토리 표지와 새 디자인 관련 **18개**를 다시 통과했다.
- **1365×900, 820×1180, 390×844, 844×390, 320×740**에서 소개·서재·집중 창, 필터·검색·방향키/Escape·초점 복귀와 가로 넘침을 검사했다. 실제 화면을 확인했다.
- 기존 작품 사본 **9개**를 UI로 가져와 첫 페이지8/다음 페이지1, 검색 후 유효 페이지로 복귀, 전체 작품 보존을 확인했다. 분류/검색의 책 화면 복귀·reload 복원도 검증했다.
- 기본/세 면 표지의 방향키·손잡이, pointer cancel, undo/redo·Apply/Cancel을 확인했다. 실제 pointer drag 적용 후 cover/updatedAt 외 project 전체가 동일했다.
- 원작 선녀와 놀스토리 흥부의 표지 편집→저장→reload→내보내기→별도 context 가져오기→재내보내기에서 project 전체 일치를 확인했다.
- 새 집중 창에서 시작한 **8작품**이 Chromium와 설치된 Google Chrome의 실제 Ren’Py로 진입하고 같은 iframe을 유지했다. 소리 입력 잠금 해제도 확인했다.
- 이번 표지를 적용한 기존 흥부 파일은 **227컷·225컷** 두 갈래를 실제 엔딩까지 읽고 슬롯·지난 기록·재시작·편집 복귀 및 archive 전체 일치를 확인했다. 검증 입력과 SHA256을 별도로 보관했다.
- 독립 코드·보안 검토에서 최종 CRITICAL/HIGH/MEDIUM 지적 없음. 개발 의존성의 기존 미수정 braces 경고는 남으며 production audit는 통과했다.

Tab/Shift+Tab 초점 순환과 중첩 이미지 창 Escape도 직접 확인했다. 글자 크기 fitting이 선택 크기를 초기화하던 결함을 수정해 실제 typography 변화를 확인했고 제목판은 글 영역만 감싼다.

검증 중 발견한 페이지 단면의 표지 겹침, 책 시작 화면 빛 장식의 휴대폰8px 넘침, 장식 표지/본문 제목의 접근성 중복, 아이콘 버튼 이름, 과도한 책등 미리보기 높이를 수정했다. 이전 완료 감사의 tracked 파일은 보존하고 이번 파일·결과를 별도 폴더에 저장했다.

[완료 감사](evidence/library-book-design/completion-audit.json), [전체 host](evidence/library-book-design/host-regression.log), [최종 디자인](evidence/library-book-design/core-design.log), [8작품 native](evidence/library-book-design/eight-native-focus.log), [Chrome8작품](evidence/library-book-design/chrome-eight-native.log), [흥부 입력](evidence/library-book-design/heungbu-native-input.knolstory), [흥부 native 경로](evidence/library-book-design/heungbu-native-reading.json), [직접 이동 적용](evidence/library-book-design/pointer-apply.log), [원작 왕복](evidence/library-book-design/seonnyeo-classic-cover-roundtrip.json), [놀스토리 왕복](evidence/library-book-design/heungbu-cover-roundtrip.json).

화면 PNG는 같은 evidence 폴더에 로컬 보관한다. 로그의 기기 절대 경로는 placeholder로 정규화하고 반복 HTTP access 줄은 생략했다. 실제 Windows/크롬북/Android 기기의 성능을 확인했다고 주장하지 않는다. 이 목표는 로컬 구현과 검증이며 이전 PR의 CI 성공을 이번 변경의 CI 성공으로 확대하지 않는다.

자체 점검: 정확성4/5(파일·native·화면 확인; 실물 기기 제외), 완결성4/5(소개/서재/표지 직접 조작과 전 흐름 완료; 디자인 취향에 따른 후속 개선 가능), 명확성4/5(원본/초안/파일/런타임 경계 구분), 실행 가능성4/5(기존 준비 명령 재사용), 간결성4/5(동일 문서와 별도 evidence). 평균4.0/5.


## 2026-10-08 소유자 화면 정정: 책만 선반 위에 놓기

이전 결과는 책 밑에 별도 제목과 실행 버튼을 두어 책이 선반 위에 닿지 않았고, 화분·전경 소품의 깊이도 빠졌다. 소유자가 첨부한 이전 story-maker 화면을 기준으로 다시 수정했다. `86adfec`의 상판 화분/흐린 전경과 `675e6d1`의 책·선반 접촉 규칙을 읽었으며, 자료 binary는 고정18da4fc에서 복원했다. 최신 구현만 참고하지 않고 이전 디자인 의도를 비교했다.

책 버튼은 선반 첫 행의 바닥에 정렬하고 선반 판의 상단은 동일 좌표에서 시작한다. 책 밑 제목·읽기/편집/준비/이어읽기 버튼을 제거했다. 선반에는 책을 선택하는 버튼 하나만 있고 모든 행동은 책 선택 집중 창에 있다. 숨겨진 제목은 접근성/검색 문맥에만 남는다. 선반 앞면·옆 기둥·상판·접촉 그림자를 나눠 실제 책장 물성을 구성했다. 작은 화면도 같은 규칙으로 책이 선반에 닿는다.

화분을 서재 header에서 첫 책장 상판으로 옮기고, 앞쪽 식물/책·의자/조명 두 소품을 기존 자료에서 복원해 blur3px/saturation으로 처리했다. 책과 선반에는 blur를 적용하지 않는다. 장식은 pointer-events:none/aria-hidden이며 화면 밖으로 이어지는 전경은 방의 바깥에서 crop돼 클릭·가로 넘침을 만들지 않는다. 방 이미지의 바닥선을 마지막 책장 바닥과 맞추는 기존 `.805` 투영을 사용한다.

이번 자료는 room/shelf/plant/foreground-left/foreground-right의5파일이다. 사용자 소유권·재사용 허가를 유지하고 복원 manifest/해시/provenance에 추가했다. story/runtime schema는 변경하지 않았다.

새 검사는 다섯 화면 크기에서 모든 책 하단과 선반 상단의 차이가2px 이내인지 측정하고, 각 책에 선택 버튼만 하나 있는지 확인한다. 기존 파일/편집/읽기 검사는 숨겨진 빠른 실행 버튼을 유지하지 않고 `책 선택 → 집중 창에서 행동 선택`의 실제 새 동선으로 변경했다. 전경 blur·noninteractive 설정도 검사한다. 최종 화면은 evidence의 shelf-contact-1365/820/390/844/320.png에 로컬 보관한다.


소유자의 추가 정정에 따라 위의 판본별 책장을 하나의 연속 책장으로 다시 통합했다. 최종 구조는 상판·좌우 기둥·연속 선반·하단 서랍이며, 실제 책장 안쪽 가로 공간이1100/900/600px 경계를 넘는지 ResizeObserver로 측정해5×2/4×2/3×3/2×4와 capacity10/8/9/8을 적용한다. 화면 이름이나 기기를 고정으로 추정하지 않는다. 남는 칸도 빈 선반으로 유지하고, 원작·놀스토리 등 분류는 필터와 접근성 region으로 남긴다. 각 책은 선택 버튼 하나만 갖고 행동은 집중 창에서만 노출한다.

이번 디자인은 전체 책장 안에서 판본별 영역을 따로 감싼 카드/박스를 만들지 않는다. 페이지 이동은 서랍 면에서 수행한다. 실제 검사는 네 가로폭에서 columns/rows/capacity, 동일8권 보존, 책/선반 접촉2px 이내, 단일 책장/서랍, 각 책의 버튼1개를 확인한다. 새 디자인 취향은 첨부된 과거 화면을 기준으로 수정한 결과이며 앞선 디자인 감사의 화면을 최종 모습으로 주장하지 않는다.


최종 정정 검사: 전체 정적 host65개(반대 native26skip), 관련디자인14개, 새로운 책 선택→집중 창→8작품 actualRen’Py,805단위/계약/통합 및24Python 검사를 통과했다. 타입·린트·build·productionaudit와1346media해시가 일치했다. 독립 검토에서 high/medium 지적은 없었으며 모든책/원작 페이지기억 공유는 별도키로 수정했다. [이번 정정 검증](evidence/library-book-design/cabinet-correction/verification.json), [전체host](evidence/library-book-design/cabinet-correction/full-host.log), [네배치/접촉/버튼없음 검사](evidence/library-book-design/cabinet-correction/final-design.log), [8작품native](evidence/library-book-design/cabinet-correction/native-eight.log). 최종 실제 화면은 같은 폴더의 final-cabinet.png에 로컬 보관한다.
