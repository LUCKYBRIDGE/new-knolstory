# 검증 근거(checkpoint) 형식

새 근거는 `docs/architecture/evidence/<주제>-<YYYY-MM-DD>/checkpoint.json`에 새로 만든다. 기존 checkpoint는 당시 기록이므로 고치지 않는다(바꾸려 하면 hook이 확인을 묻는다). 나중 결과가 앞 결과를 대체하면 새 checkpoint에서 앞 파일을 가리킨다.

이 저장소의 최근 checkpoint가 실제로 쓰는 키다. 해당하는 것만 쓴다.

| 키 | 내용 |
|---|---|
| `date` | 기록 날짜 `YYYY-MM-DD` |
| `scope` | 이번 변경과 검증의 범위 한 문장. 무엇을 포함하고 무엇은 아닌지 |
| `sourceBase` 또는 `build` | 기준 커밋 SHA, 빌드 식별자 |
| `sourceSha256` 또는 `sourceHashes` | 미커밋 변경이면 관련 파일의 SHA-256 |
| `validation` | 실행한 명령과 실제 결과. focused와 전체, red와 green을 나눠 적는다 |
| `limits` | 확인하지 않은 것: 실기기, 보조 기술, 외부 앱, 실제 배포, 느린 망 |
| `next` | 다음 행동, 또는 완료 |
| `supersedes...` | 이 기록이 대체하는 앞 checkpoint 파일 |
| `review` | 독립 검토(`knol-review`) 결과 요약 |

원칙(계획 문서의 '실행·검증 기록의 최소 단위'와 같다):
- 처음 실패를 지우지 않는다. 고친 뒤 재실행 결과를 따로 링크한다.
- 부분 실행 결과를 합쳐 '전체 통과'라고 쓰지 않는다.
- 모의(viewport 흉내, 모의 파일 핸들)와 실제(native Ren'Py, 외부 앱, 실기기)를 구분한다.
- 스크린샷·trace·원고 사본은 `.gitignore`가 로컬에만 두게 한다. 커밋하지 않는다.
- 로컬 절대 경로를 넣지 않는다. 저장소 루트 기준 상대 경로로 쓴다.
