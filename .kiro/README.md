# Kiro 하네스 (KnolStory Next)

Kiro IDE(Claude 모델)에서 이 저장소를 작업할 때 쓰는 구성이다. Codex 양식(`AGENTS.md`, `apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, `.agents/skills/`)은 그대로 두고 읽기만 한다. Kiro는 두 `AGENTS.md`를 원래 항상 읽으므로 여기에 다시 옮기지 않았다. 스킬 형식과 흐름은 [mattpocock/skills](https://github.com/mattpocock/skills)를 참고해 다시 썼다([출처](THIRD_PARTY.md)).

## 처음 쓸 때
1. 새 세션을 열면 세션 시작 요약(로컬 Git·최근 작업 흔적)이 자동으로 붙는다.
2. `/knol-router`: 지금 무엇을 할지 모르겠을 때.
3. `/knol-status`: 로컬·GitHub·Cloudflare·실제 응답까지 전체 점검.
4. Codex가 하던 작업을 이어받을 때는 "하던 작업 이어서"라고 하면 `knol-resume`이 쓰인다.

## 구성
| 위치 | 내용 |
|---|---|
| `steering/kiro-harness.md` | 항상 로드. 소유 경계, 기록 위치, 소통 규칙만 |
| `steering/<영역 절차>.md` | Codex 영역 절차를 포함 참조로 원문 그대로 넣는다. 경로(fileMatch)나 요청 내용(auto)으로 로드 |
| `steering/kiro-specs.md` | spec 파일을 다룰 때 로드되는 spec 형식 |
| `steering/kiro-writing.md` | 하네스를 고칠 때 로드되는 작성 기준 |
| `skills/knol-*` | 작업 흐름 스킬(목록은 아래) |
| `agents/knol-reviewer.md` | 읽기 전용 검토 하위 에이전트 |
| `hooks/*.json` | 세션 시작 요약, 셸·파일 쓰기 안전 확인 |
| `scripts/` | hook이 부르는 판정 스크립트와 하네스 자체 검사 |
| `specs/` | 여러 세션 작업의 요구·설계·task. 상태와 근거는 정식 문서가 소유 |

## 스킬
직접 호출(`/이름`으로만):
- `knol-router`: 흐름 안내도.
- `knol-status`: 읽기 전용 상태 점검.
- `knol-grill`: 질문 라운드로 계획을 다듬고 결정을 정식 문서에 기록.
- `knol-spec`: 대화를 `.kiro/specs/`의 요구·설계·task로 정리.
- `knol-implement`: task나 합의한 변경을 구현(TDD → 검토 → 검증 → 커밋).
- `knol-retro`: 세션 회고로 환경 개선점 제안.
- `knol-handoff`: 다른 도구·사람·컴퓨터로 넘길 인수인계 문서.

자동 호출(요청에 맞으면 Kiro가 스스로 쓰고, `/이름`으로도 부를 수 있음):
- `knol-resume`: 다른 에이전트가 멈춘 지점 재구성.
- `knol-tdd`: red → green 한 조각씩.
- `knol-diagnose`: red가 되는 재현 고리부터 시작하는 버그 진단.
- `knol-review`: 기준·요구 두 축 검토.
- `knol-verify`: 완료 보고 전 검증과 기록.

## 스티어링
- 항상: `kiro-harness`.
- 경로로 로드: `asset-pipeline`, `design-system`, `renpy-runtime`, `runtime-contract`, `runtime-qa`, `stage-layout`, `story-document-compat`, `web-service-boundary`, `kiro-specs`.
- 요청 내용으로 로드: `legacy-baseline`, `legacy-design-reference`, `migration-check`, `release-gate`, `kiro-writing`.

경로 패턴은 각 파일의 front matter가 원본이다. 영역 절차의 원문 안 상대 링크는 원본 폴더 기준이다(`../../../`가 저장소 루트).

## 안전 hook
| hook | 시점 | 하는 일 |
|---|---|---|
| `session-brief` | 세션 시작 | 브랜치, origin/main과의 관계, 미커밋 파일과 수정 시각, 최근 `.cache/` 흔적, Codex 실행 여부 |
| `guard-shell` | 셸 실행 전 | 되돌리기 어려운 명령은 막고(강제 push, `reset --hard`, 중요 폴더 재귀 삭제, DB 볼륨 삭제, Cloudflare 자원 삭제), 바깥에 영향이 가는 명령은 확인을 묻는다(push, 배포·업로드, 운영 컨테이너, PR·이슈 변경, 운영 주소 쓰기 요청, 보호 경로 셸 쓰기) |
| `guard-write` | 파일 쓰기 전 | Codex 양식, 기존 근거·이력, 생성기 출력, hook 자체, 작업 공간 밖 파일이면 확인을 묻는다. 막지는 않는다 |

2026-10-31 사용자 결정으로 `guard-shell`과 `guard-write`는 꺼 두었다(각 파일의 `"enabled": false`). 판정 스크립트와 사례 검사는 그대로 두므로 다시 켤 때는 그 값만 지운다. `session-brief`는 켜져 있다.
hook 입력을 읽지 못하면 막지 않고 통과시킨다(입력 형식이 바뀌어도 셸이 멈추지 않게). 마지막 입력의 키 이름만 `$TMPDIR/knol-kiro-guard-*-last.json`에 남긴다. 값은 남기지 않는다.

## 고친 뒤 검사
```
node .kiro/scripts/check-kiro.mjs
```
front matter 형식, 포함 참조 대상, 경로 패턴이 실제 파일과 맞는지, Codex 절차가 모두 포함됐는지, 링크와 백틱 경로, 로컬 절대 경로, em dash, 이전 제품 용어, 이 README와 `knol-router`의 목록, hook 판정 사례를 확인한다. 저장소의 링크·용어 검사기(`scripts/check-project-docs.mjs`, `scripts/check-product-language.mjs`)를 그대로 불러 쓴다.

## 외부 서비스 작업에서 배운 것
- Cloudflare 권한은 기록이나 요약을 믿지 말고 `/knol-status`의 'wrangler 로그인 권한' 줄로 확인한다.
- `wrangler login`의 승인 창은 120초 뒤 닫힌다. 이 Mac의 기본 브라우저는 ego lite다. 사용자가 권한 추가를 승인했으면 `wrangler login --browser=false --scopes …`로 링크만 받고, ego 작업 공간에서 그 링크를 연다. 동의 화면에 적힌 권한이 승인 범위와 같은지 확인한 뒤 Authorize를 누르거나 사용자에게 넘긴다.
- 2분이 넘는 명령은 `control_bash_process`로 돌린다. `run_in_background`가 `;`로 이은 명령을 떼어 내지 못해 120초에 끊긴 적이 있다.
- Cloudflare는 Python urllib 요청을 403(error 1010)으로 막는다. 배포 파일 확인은 그 주소를 연 실제 브라우저 안의 같은 출처 fetch로 한다([2026-10-31 근거](../docs/architecture/evidence/story-edge-cutover-2026-10-31/checkpoint.json)).
## Codex와 함께 쓰기
- 같은 작업 트리를 함께 쓴다. 이 세션이 만들지 않은 미커밋 변경은 다른 에이전트의 진행 중 작업일 수 있다.
- 정식 기록은 둘 다 같은 곳에 남긴다: 계획 `docs/architecture/product-completion-plan.md`, 상태 `STATUS.md`, 근거 `docs/architecture/evidence/`.
- Kiro에서 Codex로 넘길 때는 `/knol-handoff`.
- 영역 절차를 고쳐야 하면 Codex 원본(`.agents/skills/`)을 사용자 승인 아래 고친다. Kiro 스티어링은 원문을 포함하므로 따로 고칠 것이 없다.
