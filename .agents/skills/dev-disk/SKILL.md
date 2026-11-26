# 개발·테스트 디스크 사용 스킬

운영(Docker의 db·api·ingress), 개발, 테스트가 Mac mini 한 대에서 함께 돈다. 2026-11-25에 긴 E2E 실행의 Playwright 출력(약 17GB)이 내장 디스크를 0GB까지 채웠다. Docker Desktop은 로그를 내장 디스크에 쓰므로 ENOSPC로 멈췄고, 운영 API가 약 10시간 502를 냈다. 그래서 **내장 디스크에는 새 개발·테스트 데이터를 쓰지 않는다.**

## 디스크 역할

| 디스크 | 쓰는 것 |
|---|---|
| 내장 디스크 | OS, 앱, Docker Desktop 로그·설정, 홈 폴더. 새 작업 폴더·테스트 출력은 두지 않는다 |
| 외장 개발 디스크 (`KNOL_DEV_ROOT`) | 새 작업 폴더와 그 안의 `node_modules`·`.next`·`.next-dev`·`.turbo`·`.cache`, 무시된 미디어(`apps/web/public`), Playwright 출력, E2E 임시 파일. Docker 데이터도 같은 디스크에 있다 |
| 백업 디스크 | DB 백업 전용. 작업 데이터를 두지 않는다 |

기기별 실제 경로는 [ADR 0012](../../../docs/decisions/0012-toolchain-and-monorepo.md#로컬-경로)에만 적는다. 스크립트와 설정은 아래 환경 변수만 읽는다.

| 변수 | 뜻 |
|---|---|
| `KNOL_DEV_ROOT` | 새 작업 폴더를 만드는 외장 디스크 폴더 |
| `KNOL_TEST_OUTPUT_ROOT` | Playwright 출력 루트. 설정하면 모든 Playwright 설정의 `outputDir`이 `<루트>/<작업 폴더 이름>/<원래 상대 경로>`로 바뀐다 |
| `KNOL_DISK_MIN_FREE_GB` | 디스크 가드 기준. 기본 25(GB), CI는 기본 0(끔) |
| `KNOL_DISK_CHECK_SECONDS` | 실행 중 점검 간격. 기본 30초 |

셸 설정(`~/.zshrc`)에 `KNOL_DEV_ROOT`, `KNOL_TEST_OUTPUT_ROOT`를 넣어 두면 기본값이 된다. `TMPDIR`은 셸 전체에 바꾸지 말고 긴 테스트를 실행할 때만 지정한다.

## 새 작업 폴더

```bash
scripts/dev-worktree.sh <이름> [--branch <브랜치>] [--base origin/main] [--media-from <미디어가 있는 작업 폴더>]
```

1. `$KNOL_DEV_ROOT/new-knolstory-<이름>`에 worktree를 만든다. 외장 디스크가 없거나 여유가 기준보다 적으면 멈춘다.
2. git이 무시하는 미디어(`apps/web/public`의 runtime·assets 등)를 **복사**한다. 링크하지 않는다. 한 작업 폴더의 runtime 재빌드가 다른 폴더를 바꾸면 안 되고, 내장 디스크를 가리키는 링크는 데이터를 내장 디스크에 남긴다.
3. 루트와 `server/`에 의존성을 설치한다. pnpm은 외장 디스크 루트의 store를 쓴다(볼륨이 다르면 하드링크를 못 하기 때문).

- 다른 세션이 작업 중인 기존 작업 폴더는 옮기지 않는다. `git worktree list`로 확인하고, 끝난 폴더만 사용자 확인 후 정리한다.
- 외장 디스크가 빠지면 그 작업 폴더도 사라진다. 커밋하지 않은 작업은 오래 두지 않는다.

## 긴 테스트

1. 모든 Playwright 설정은 `tests/disk-guard.ts`의 전역 setup을 쓴다.
   - 시작 전: 홈(내장 디스크), `TMPDIR`, 출력 폴더의 디스크 중 하나라도 여유가 `KNOL_DISK_MIN_FREE_GB`보다 적으면 시작하지 않는다.
   - 실행 중: `KNOL_DISK_CHECK_SECONDS`마다 다시 재고, 기준 아래로 내려가면 SIGINT로 실행을 멈춘다. Playwright가 브라우저와 webServer를 정리하고 종료 코드 130으로 끝난다. 60초 뒤에도 남아 있으면 SIGTERM을 보낸다.
2. `--output`을 직접 줄 때도 외장 디스크 경로를 준다. 세션 scratchpad(`/private/tmp`)나 저장소 안은 내장 디스크일 수 있다.
3. 긴 실행은 브라우저 임시 프로필도 외장 디스크로 보낸다: `TMPDIR="$KNOL_DEV_ROOT/tmp" pnpm test:e2e ...`
4. 별도로 띄운 dev 서버는 로그를 외장 디스크의 파일로 보낸다. 실행을 중단했다면 다음 실행 전에 그 포트의 서버가 응답하는지 확인한다.
5. 실행이 끝나면 통과한 실행의 출력은 지운다. 실패 근거로 남길 것만 남긴다.

## 내장 디스크 정리 규칙

삭제 전에는 항상 무엇을 얼마나 지우는지 사용자에게 보여 주고 확인을 받는다. 운영 컨테이너(`knolstory-next-production-*`)와 Docker Desktop은 멈추거나 재시작하지 않는다. 다른 프로젝트의 컨테이너·이미지·볼륨은 건드리지 않는다.

| 대상 | 규칙 |
|---|---|
| 작업 폴더 안 `test-results*`, `playwright-report*`, `.cache/*-results` | 실행이 끝나면 지운다. 실패 근거는 필요한 것만 남긴다 |
| 작업 폴더 안 `.turbo/cache` | 수십 GB까지 자란다. 한 달 넘은 항목은 지워도 다시 빌드된다 |
| 작업 폴더 안 `.cache/` 실험 산출물 | 끝난 실험의 산출물은 정리한다. 근거로 필요한 것은 `docs/` 증거 규칙을 따른다 |
| 끝난 작업 폴더 | 병합·종료된 브랜치의 worktree는 `git worktree remove`로 정리한다 |
| 세션 scratchpad (`/private/tmp/claude-*`) | 끝난 세션의 큰 출력은 지운다 |
| Docker 이미지·빌드 캐시 | KnolStory 이미지만, 운영 컨테이너가 쓰는 이미지를 빼고 정리한다 |

내장 디스크 여유가 25GB 아래면 긴 테스트를 시작하지 않는다. 운영 감시와 경고는 운영 점검 스크립트가 맡는다.
