# 현재 작품 전환·사본·파일·읽기 재개 회귀 — 2026-10-14

[직전 읽기 경계](reader-current-regression-validation.md)를 이어 나머지 구간을 실행했다. 실제 수집은122개다. 이전 문서의 다음121은 당시 추정이며 현재 실행 기준으로 교정한다. 현행 문서8/등록 자료와 기존 private 보존·530음원/23별칭·on-demand/Pixabay14 제한을 유지한다. 모든 옛 양식 지원이나 제거된 UI 복원은 목표가 아니며 Excel ChatGPT 연결은 제외한다.

## 기준 실행과 현재 이행

[122개 기준](evidence/after-reader-current-2026-10-14/host.log)에서 responsive audio2개와 논리 좌표1개는 통과했고 native전용3개는 제외됐다. 초기 probe의 옛 ‘글 편집 영역 접기’ 이름을 찾던1실패를 확인한 뒤, 다음 runtime failure검사 중 의도적으로 중단했다. 관찰3통과/1실패/3제외/1중단/114미실행이다. 완료 보고가 없는 중단 실행이며 전체 성공으로 합산하지 않는다. source snapshot/context/trace를 보존하고 orphan owned3110만 종료했다.

[probe 집중 후속](evidence/after-reader-current-2026-10-14/probe-final.log)은3통과다. 현재 EditingProbe의 실제 ‘편집 패널 접기/열기’ 이름만 맞췄고 iframe·한국어·논리X240·viewport변경·overflow·503시입력유지와핸들없음 검사는 그대로다.1280×720 초기 좌표 probe는 현재 제품 StoryDocument 편집기/읽기 검증과 별도이며 옛 화면을 제품에 복원하지 않았다.

stories spec은 source 대조에서 제거된 ‘작품 선택’ select를 계속 사용했다. [진단 기준](evidence/after-reader-current-2026-10-14/stories-baseline.log)은 첫 작품1실패/11미실행이다. 사라진 select를 확인하는 진단 실행만timeout15초/maxfail1로 했으며 최종 검증의시간을낮추거나native기다림을건너뛰지않는다. 현재 서재→책 dialog→놀스토리판본→편집으로 보호 사본을 만들고 내작품 카드로 사본을 다시 연다.

| 항목 | 현재 구현/검증 |
|---|---|
| 네 작품 편집/파일 | 각 기본 작품의 사본에서 글 수정·기기 저장/reload·파일 내보내기/재가져오기·reopen. 변경한cut의text만 허용하고 전체 원고/Flow/Stage 등 비교 |
| 독립 작품 전환 | 선녀/흥부 각각 다른project ID를 가진 내사본. 실제 서재 카드 전환 뒤 두 작품 전체 content와 글 유지 |
| 다른 작품 가져오기 | 흥부 파일을 선녀 편집 중 적용해 독립 imported ID 확인. 이후 기존 선녀/흥부 내사본의 전체내용 보존 |
| 잘못된 입력 | 손상JSON·빈chapters/lines·unknownasset을 현재8문서에서 거부하고 기존원고전체유지 |
| 연결 대기/종료 | 현재선택지도구의 goto에서빈대상과명시ending을구분.실제native준비/소리unlock·keyboard다음·Core pending/ended·이전읽은cut·편집복귀와원고전체유지 |
| 읽기 재개 | 실제두cut path를읽은뒤reload.읽기메뉴/실제rendered ack·전체playback상태·되돌림path1·읽은cut의편집복귀/전체내용보존 |

파일 가져오기 결과가 작품 준비로 돌아오는 실제 current 경로도 검사한다. 첫 이행 [3실패/9미실행](evidence/after-reader-current-2026-10-14/stories-first.log)은 가져오기 뒤 편집 전용save-status를 곧바로 기대했다. 현재 준비화면의 ‘현재 컷 쓰기’를 실제 클릭한뒤저장/글비교로진행한다. current directEditor로시작한경우그대로편집으로돌아오는경로도유지한다. 기본원본이아닌보호사본에서수정하며독립ID차이만허용한다.

‘이전 읽은 컷’은 StoryTextAccessibility에 연결된 실제 Core onBack keyboard/semantic 명령이다. clipped 시각 요소를 마우스로 누르지 않고 focus/Enter를 사용한다. 현재지원경로이므로지난기록UI로임의대체하거나삭제하지않는다.503모의probe와실제Ren’Py를기다리는stories읽기검사의범위를구분한다.

## 현재 결과

[최종 stories](evidence/after-reader-current-2026-10-14/stories-second.log)는 한 실행에서12개 통과다. host 프로젝트에서 실제 Ren’Py 응답을 기다려 pending/ending과 두cut 재개를 검사하며 protocol모의 renderer를 사용하지 않는다. 관련E2E전용tsc·ESLint·[저장/가져오기/되돌림단위](evidence/after-reader-current-2026-10-14/related-unit.log)는4파일25개통과다. 이번변경은검사/문서이며제품 UI/Core/native나형식버전변경은없다. currentstaticbuild를사용하고새빌드/fullunit실행을주장하지않는다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 현재stories12개 | 이행·범위 검증 완료 P1 |서재보호사본/파일/reader/실제native |원래12개 의미와전체내용·독립성·pending/ending·재개/assert를유지한최종성공 |
| 나머지구간/full388 | 미실행/이행 P1 |current도구·미디어·저장상태 |이번focused성공을합산하지않고나머지실행후fullcollection별도확인·오류/제외분류 |
| UI-OPTIONAL-REVIEW | 부분 P1 |최신UX목표·source분류·실제제작동선 |핵심제작항목의사용/취소/파일/native를검증하고필요성판정 |
| 삼성/물리입력·최초Chrome | 실제입력미검증/조사 P1 |실기기·재현trace |viewport/키보드명령·후속native성공과별도검증 |
| 새외부앱/배포 | 미실행 |실제환경/범위 |localcodec/과거artifact와새결과구분.ExcelChatGPT연결은의도적제외 |
