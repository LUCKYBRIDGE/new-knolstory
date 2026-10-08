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
