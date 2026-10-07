# 책 소개·서재·표지 제작·읽기 연결

## 기준과 목표

고정 레거시 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`의 `StoryStudio.tsx`, `story-landing-visit.ts`, `StoryDiscovery.tsx`, `BookCoverEditor.tsx`, 표지 layer 도구·모델을 읽기 전용으로 참고한다. 기존 원작4편/놀스토리4편 및 강화된 연출·오디오를 재사용한다. 새 이야기·장면 렌더러·파일 형식을 만들지 않는다. 표지는 정적 책 UI이며 이야기 무대는 Ren’Py만 담당한다.

## 행동 분류와 조사된 결함

| 행동 | 분류 | 수정 범위 |
|---|---|---|
| 최초 home/방문 기록 후 library | PRESERVE/REFINE | Next 방문 환경설정으로 책 소개/서재 구분, 레거시 키는 변경하지 않음 |
| 저장된 탐색 위치 | REFINE | 새 접속은 서재, 새로고침은 현재 편집/읽기/준비/표지 위치, 작품별 편집·읽기 context는 별도 보존 |
| 기본/자유 배치 및 세 면 layer 표지 | PRESERVE/REFINE | 기존 cover/design/composition/presetId 모델 재사용, draft·적용·취소·되돌리기와 범위 안내 |
| 서재 thumbnail과 start 표지 불일치 | FIX | 동일 BookCover/순수 해석 모델을 썸네일·미리보기·책 시작에 사용 |
| 서재 읽기 버튼의 바로 컷 진입 | REFINE | 개별 책 표지·소개를 거쳐 실제 Ren’Py 진입 |
| 최초에도 서재 직행 | FIX | 책 소개 및 재방문 이동 제공 |
| 고급 표지는 데이터만 보존 | FIX | 앞표지·책등·뒤표지 글/그림·재질·띠지와 편집 연결 |

## 진입·저장 우선순위

명시적 `?view=editor`는 기존 직접 편집 호환 경로다. Next 저장 작품도 없는 첫 접속은 책 소개, 방문 기록 또는 기존 Next 작업이 있는 새 접속은 서재다. navigation type reload는 현재 tab의 저장된 화면을 복원한다. 첫 방문 flag는 `knolstory-landing-visit-v1` 브라우저 설정이며 StoryDocument/파일에 포함하지 않는다. 저장이 차단돼도 안내에서 서재로 들어갈 수 있다. 레거시 `storygame*` 저장소는 쓰지 않는다.

표지 편집 초안은 적용 전까지 기기 저장/작품을 변경하지 않는다. 창을 취소하거나 닫으면 적용 전 cover로 돌아간다. 기본 배치 되돌림, 편집 전 표지 되돌림, layer 제거는 서로 구분하며 기존 직접 위치를 임의로 덮지 않는다. 작품 제목도 표지 편집 초안에서 수정할 수 있으며 적용할 때 제목과 cover를 함께 반영한다. 제목을 수정하지 않으면 그대로 보존하고 대본·분기·배치·음원은 항상 유지한다.

## 자산과 다른 컴퓨터

표지용 네 WOFF2는 고정 기준의 파일을 그대로 가져오고 동일 폴더의 OFL 저작권 고지·변환/이름변경 README를 함께 배포한다. 제작/권리 override는 해시에 묶어 유지한다. 새 외부 다운로드·유료 작업을 수행하지 않았다. 기존 이미지의 미확인 배포 권리 차단은 유지하며 GitHub 코드 전달과 서비스 공개 출시를 혼동하지 않는다.

## 진행 중 검증

첫 진입/재접속/새로고침/직접 편집 우선순위와 workspace 신규 view 왕복10개, 기본/자유 배치/세 면 모델 및 편집 helpers26개가 통과했다. 최초소개→서재→책시작 UI 검사 통과. 기존 원작/놀스토리의 실제 표지 draft·취소·layer·파일 왕복과8작품 native 진입, 모바일 조건과 전체회귀는 진행 중이며 완료로 표시하지 않는다.

## 독립 보안 검토와 의존성 점검

독립 보안 검토에서 표지 문자열은 React children으로 이스케이프하며, 이미지 URL은 검증된 자산 ID로만 해석하는 것을 확인했다. `dangerouslySetInnerHTML`과 임의 원격 그림 URL을 사용하지 않는다. 모든 기존 cover schema의 범위/색/상자·중복ID·총량 검증을 유지한다.

`pnpm audit`에서 uuid8의 잘못된 출력 버퍼 범위 경고를 발견해 CJS/browser 지원을 유지하는11.1.1로 override하고 전체 문서/표·Excel 계약과 build를 재검증한다. 개발 의존성 braces3.0.3의 [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)은 확인 시점에 수정 release가 없다. 경로는 eslint-config-next→Next ESLint plugin→fast-glob→micromatch이며 고정 `apps/web/` lint rootDir만 사용한다. 정적 앱의 실행 경로에는 포함되지 않는다. 경고를 ignore 목록으로 숨기지 않고, PR의 ESLint config 변경을 검토하고 이 개발 도구 경고를 별도 제한으로 기록한다. 전체 audit는 이 경고 때문에 실패할 수 있으며 production audit 결과와 구분한다.

한 saved work의 손상이 library 전체 로딩을 중지하는 기존 정책도 검토했다. raw 저장을 보존하며 파일 복구를 제공한다. 일부 항목을 조용히 누락하고 정상 저장으로 덮어쓰는 salvage 변경은 이번 목표에 넣지 않았다. 항목별 격리/복구는 후속 문제로 기록한다.

## 다른 컴퓨터와 GitHub 범위

사용자가 검증 후 GitHub 업로드를 요청했다. 공개 저장소에는 코드·원고/계약·검증 JSON, 자체 합성 음원/절차적 벡터, OFL 글꼴을 포함하며 배포 권리 미확인 레거시 그림과 그 그림이 든 실제 화면 PNG는 포함하지 않는다. 실제 화면 근거는 이 작업 폴더에 유지한다. `restore-legacy-media.py`로 권한 있는 기존 checkout의 고정421파일을 실제 SHA256과 대조해 다른 컴퓨터에 로컬 복원할 수 있다. 도메인 추출 스크립트를 다시 돌려 현재 수정 코드를 덮어쓰지 않는다. runtime은 문서의 고정 SDK로 각 기기에서 빌드한다. 공개 서비스 출시 승인이 아니다.

## 실제 파일·화면 검증 근거

기존 선녀와 나무꾼 원작과 흥부와 놀부 놀스토리에서 전체 표지 편집을 수행했다. 기본 표지/자유 배치와 세 면의 글/그림·글꼴·위치·재질·띠지를 편집하고 초안 취소·되돌림·적용을 확인했다. 작품 제목은 초안에서 직접 바꿔 적용하고, 이전 원고의 cover/title/updatedAt 외 모든 필드가 정확히 같은지 비교했다. 저장·reload·.knolstory 내보내기·다른 Chrome context 가져오기·재내보내기에서 project 전체가 동일했다.

[원작 표지 파일](evidence/book-entry-cover/seonnyeo-classic-cover.knolstory), [놀스토리 표지 파일](evidence/book-entry-cover/heungbu-cover.knolstory), [원작 왕복](evidence/book-entry-cover/seonnyeo-classic-cover-roundtrip.json), [놀스토리 왕복](evidence/book-entry-cover/heungbu-cover-roundtrip.json). 실제 화면PNG는 같은 evidence 폴더에 로컬 보관하며 미확인 레거시 이미지가 있으므로 공개 Git에 올리지 않는다. PC1280×900, 가로844×390, 세로390×844에서 잘림/넘침과 터치·탭·Escape 취소를 검사했다. 실Android 검증으로 주장하지 않는다.

강화된 기존8작품은 서재→책표지→실제 native 읽기→서재를 같은 iframe에서 반복했다. 편집한 흥부 작품은 양쪽 갈래227/225컷을 실제 Ren’Py 엔딩까지 읽고 슬롯복원·기록·재시작·편집복귀 후 archive 전체 일치를 확인했다. 그 입력을 [고정 native 검증 입력](evidence/book-entry-cover/heungbu-native-input.knolstory)으로 보관하며 [경로 기록](evidence/book-entry-cover/heungbu-native-reading.json)의 파일SHA와 대조한다. 이후 제목 적용 UI 검사에서 다시 생성한 표지 파일과 구분해 검증 입력을 잃지 않는다.

최종 관련 표지host5 및8작품 native진입1, 편집된 흥부두경로1, 숏스토리2/DPR3와 원고/오디오관련 native5를 통과했다. 전체host50과792단위/계약/통합(46파일), line97.83%/statement93.18%/branch89.66% 및 타입·린트·정적build와 productionaudit를 확인했다. 개발braces 경고는 위 제한대로 남는다. 전체 기존native회귀22개를 추가 통과했다. 19skip은 해당프로젝트 반대 경로이며 host와 분리해 실행했다.

자체 검토: 정확성4/5(전체 project 비교·실제 native 경로·SHA 확인; 실기기 미검증), 완결성4/5(첫 방문/표지/8책 진입 및 파일 흐름 확인; 공개 출시 권리 제외), 명확성4/5(방문/책 시작/표지 초안 범위와 제한 구분), 실행 가능성4/5(다른 컴퓨터 절차 제공; private media는 기존 권한 필요), 간결성4/5(단일 검증 문서). 평균4.0/5. 공용 CI의 코드 검사와 로컬 전체 미디어 검사 범위를 구분하고, 개발 도구 경고와 레거시 권리 문제를 숨기지 않는다.

GitHub 첫 source CI는 대형 원고 보존 test의 동일 컷 정렬/선형검색 반복 때문에5초 제한을 넘겼다. 비교 항목과 전체 원고 범위를 유지하면서 선택 컷과 결과Map을 루프 밖에서 한 번 계산해 수정했다(로컬 해당7tests 통과). 표지 제목도 기존 Core의200자 검증을 적용 전에 재사용해 잘못된 초안이 저장 상태를 바꾸지 않도록 RED→GREEN UI검사를 추가했다.
