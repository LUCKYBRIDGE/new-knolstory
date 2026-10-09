# 기존 8작품을 다른 컴퓨터에서 시험하기

## 범위와 준비 조건

책 소개·서재·표지 편집·책 시작·Ren’Py 읽기는 이미 구현돼 있다. 이 절차는 같은 기능을 새로 구현하지 않고, 공개 소스만 받은 환경에서 빠지는 의존성·권한 있는 레거시 그림·공유 런타임·브라우저를 준비한다. `StoryDocument`/`.knolstory`가 원본이며 작품마다 별도 런타임을 만들지 않는다.

Git, Node `>=22.13.0`, pnpm `10.33.0`, Python `>=3.9`가 필요하다. pnpm 버전은 `package.json`을 따른다. 필요하면 `corepack enable`을 실행한다. 레거시 private 저장소의 기존 접근 권한과 `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b` 커밋을 포함하는 checkout을 준비한다. 이 자동화는 권한을 새로 부여하거나 비밀키·계정을 설치하지 않는다.

Windows에서는 WSL2 내부에 checkout과 Linux Node/pnpm/Python을 준비한다. Windows용 Node와 WSL Python을 섞지 않는다. WSL은 실행 안내이며 이번에 실제 Windows 기기에서 수행한 결과가 아니다. 크롬북의 Linux 개발 환경 제공 여부는 학교 정책을 확인해야 한다. Android는 직접 SDK를 빌드하는 환경으로 주장하지 않는다.

## 준비·점검·실행

현재 기능은 `codex/book-entry-cover`와 [열린 초안 PR #1](https://github.com/LUCKYBRIDGE/new-knolstory/pull/1)에 있으며 아직 main에 병합하지 않았다. 새 컴퓨터에서는 이 브랜치를 받는다.

```sh
git clone --branch codex/book-entry-cover https://github.com/LUCKYBRIDGE/new-knolstory.git
cd new-knolstory
```

이미 clone했다면 작업을 보존한 상태에서 `git fetch origin` 후 해당 브랜치로 전환한다. private 레거시 checkout은 별도로 기존 권한을 사용해 준비한다. 이 안내가 접근 권한을 부여하지 않는다.

저장소 루트에서 실행한다. 경로는 현재 저장소 위치와 무관하며 공백이 있으면 따옴표로 감싼다.

```sh
pnpm env:prepare --legacy ../story-maker
pnpm env:doctor
pnpm preview
```

`http://127.0.0.1:3000`을 연다. `prepare`는 다음 순서로 실패 즉시 멈춘다.

1. 도구 버전 확인 및 고정 baseline에서 레거시 작품 자산 421파일과 소개·서재 UI 10파일 복원·SHA256 대조.
2. `pnpm install --frozen-lockfile`.
3. Ren’Py 8.5.3 SDK/Web 지원과 고정 커밋의 Noto Sans KR 다운로드·SHA256 확인·안전 추출.
4. Playwright Chromium 설치.
5. `spikes/renpy-web/build.py`로 모든 작품이 공유하는 실제 WASM 런타임 빌드.
6. Next 정적 앱 빌드, 최종 doctor 확인.

SDK·Web·폰트의 URL/해시는 `scripts/prepare-runtime.py`에 있으며 `renpy/RENPY_VERSION`과 다르면 중단한다. SDK 설치 마커에는 실제 설치 파일 해시를 보관한다. 정상 빌드가 재생성하는 바이트코드·임시 결과·launcher 저장/로그는 제외하고, 예상 밖 소스 추가와 원본 변경은 거부한다. 기존 다운로드를 재사용해도 해시를 다시 확인한다. 런타임 빌드의 폰트 해시 확인도 유지한다. `KNOL_RENPY_SDK`로 외부 SDK를 직접 지정하면 기본 준비 도구의 검증 범위 밖이므로 정상 재현에는 기본 캐시를 사용한다.

`preview`는 빌드 결과를 loopback에서만 제공하고 `/probe` 같은 확장자 없는 정적 경로도 처리한다. 소스 수정은 `pnpm dev`로 실행한다. 브라우저 저장소는 origin별이므로 `localhost`와 `127.0.0.1`, 서로 다른 포트는 서로 다른 서재다. 예전 주소의 작업은 그 주소에서 파일로 내보낸다. 이번 절차가 레거시 IDB나 `storygame*` 키를 옮기거나 삭제하지 않는다.

개별 단계:

```sh
python3 scripts/restore-legacy-media.py ../story-maker
pnpm install --frozen-lockfile
pnpm runtime:prepare
pnpm exec playwright install chromium
pnpm runtime:build
pnpm build
pnpm env:doctor
```

## 기존 설치와 실패 복구

- 수동 SDK가 이미 있거나 설치 파일이 바뀌었다면 `pnpm runtime:prepare --reinstall` 후 `pnpm env:prepare --legacy ../story-maker`를 다시 실행한다. 검증한 새 SDK를 staging에 완성한 뒤 생성 SDK만 교체한다.
- 다운로드 해시가 다르면 해당 캐시 파일 이름을 보고한다. 잘못된 파일을 자동 덮어쓰지 않는다. 그 파일을 제거한 뒤 다시 준비한다. 버전/해시를 오류 회피용으로 바꾸지 않는다.
- baseline이 없는 레거시 checkout은 해당 커밋을 권한 있는 Git 원격에서 받아야 한다. 현재 레거시 브랜치의 파일로 대신 복원하지 않는다.
- Linux/WSL에서 브라우저 라이브러리가 없으면 `pnpm exec playwright install-deps chromium`을 실행한다. OS 패키지 설치에는 관리자 권한이 필요할 수 있다.
- 3000 포트 사용 중이면 해당 서버를 종료한다. `env:verify`는 오래된 dev 서버를 조용히 재사용하지 않는다. 수동 preview는 `pnpm preview --port 3001`로 실행할 수 있지만 자동 검사는 3000을 사용한다.
- Ren’Py의 생성 자산은 매번 원본 corpus에서 교체하며 Web 표지 글꼴은 복사하지 않는다. Git에서 제외된 runtime/corpus 변경이 정적 export 캐시에 가려지지 않도록 Web build 캐시는 사용하지 않는다. 앱/런타임 소스나 그림을 수정했다면 `pnpm runtime:build`와 `pnpm build`를 다시 실행한다. doctor의 파일 존재·해시 확인은 실제 렌더링 검사를 대신하지 않는다.
- `env:doctor`는 source media 451파일 해시, 런타임 주요 파일, 정적 앱과 실제 브라우저 실행을 확인한다. SDK·모든 런타임 결과의 최신성을 보증하지 않으므로 준비/빌드 뒤 verify를 실행한다.

## 기존 작품으로 검증

서버를 종료한 상태에서:

```sh
pnpm env:verify
```

이 명령은 Python 준비 도구 테스트, 타입, 린트, 전체 단위/계약/통합 coverage, 전체 미디어 provenance 검사, 다음 기존 E2E를 순서대로 실행한다. 브라우저 검사는 정적 빌드에서 실행한다.

- 첫 접속 책 소개, 재접속 서재, 소개 재방문과 새로고침 위치 복원.
- 선녀 원작과 흥부 놀스토리의 표지 초안·취소·세 면 편집·제목 적용·원고 보존·기기 저장.
- `.knolstory` 내보내기 → 별도 브라우저 context 가져오기 → 다시 내보낸 project 전체 일치.
- 8작품의 서재 → 책 표지 → 실제 Ren’Py 첫 컷·음원 unlock → 서재. 동일 iframe 확인.
- 표지를 편집한 기존 흥부 작품의 두 갈래 엔딩, 슬롯·기록·복원과 archive 일치.
- 가로/세로 viewport의 터치·키보드·넘침. 실제 Android 하드웨어 검증은 별도다.

기본 브라우저는 설치한 Chromium이다. 실제 Google Chrome도 설치돼 있다면 `KNOL_BROWSER_CHANNEL=chrome pnpm env:verify`로 별도 실행할 수 있다. Chromium 결과를 Google Chrome 실기기 결과로 기록하지 않는다. 전체 회귀는 기존 `pnpm test:e2e`, `pnpm test:e2e:stories`, `pnpm test:e2e:runtime` 명령을 그대로 사용한다.

## 작품을 다른 컴퓨터로 이동

1. 원래 컴퓨터의 서재에서 작품 준비를 열고 저장 상태를 확인한다.
2. **작품 파일 내보내기**로 `.knolstory`를 보관한다. 전송 전에 원본 파일을 별도 백업한다.
3. 새 컴퓨터에 이 테스트 환경을 준비하고 서재의 **작품 파일 가져오기**로 파일을 선택한다.
4. 작품 제목·앞표지/책등/뒤표지·본문·갈래를 확인하고, 다시 내보내어 보관한다.
5. 책 표지에서 읽기를 시작하고 슬롯 저장·불러오기 및 편집 복귀를 확인한다.

기본 예제의 Asset ID는 파일에 보존되지만 공통 레거시 그림은 새 기기의 권한 있는 corpus가 필요하다. 사용자 첨부 오디오는 archive 계약에 따라 함께 보관된다. 방문 여부·기기 서재 전체·브라우저별 읽기 슬롯·탭 위치는 작품 파일과 같은 개념이 아니다. 다른 컴퓨터에 모든 브라우저 상태가 그대로 이동한다고 주장하지 않는다.

## 공개 전달과 확인 한계

미확인 레거시 그림 421개와 그 그림이 포함된 스크린샷, SDK/cache/생성 runtime은 Git에 올리지 않는다. 공개 source CI는 private corpus 없이 준비 도구 실패 사례·타입·린트·source coverage·정적 build를 검사한다. 로컬 full media/native 결과와 구분한다. `media-provenance.py --release free`는 미확인 미디어 때문에 실패해야 하며 이 gate를 우회하지 않는다.

실제 학교 Windows PC·크롬북·Android 기기의 성능/입력/장시간 메모리, 교실 네트워크 및 사람의 음원 청취 승인과 서비스 공개 출시는 이번 자동 검사 결과로 승인하지 않는다. 재현 기록은 아래 검증 문서의 이번 실행 결과를 따른다.

## 2026-10-08 실제 실행 근거

시작 시 `codex/book-entry-cover@8e4655a`는 원격과 일치하고 작업 트리는 깨끗했으며 PR #1은 열린 초안이었다. 기존 문서 commit은 CI skip 상태였고, 문서가 가리키는 `c443c93`의 source CI 성공을 별도로 확인했다. 책 소개·서재·고급 표지·8작품의 기존 완료 감사를 읽고 이 기능들을 재구현하지 않았다.

같은 컴퓨터의 `.cache/cross-machine`에 source와 이번 수정만 복사했다. 프로젝트 의존성·레거시 그림·SDK·runtime이 없는 상태에서 권한 있는 421파일 복원, frozen 설치, SDK/Web/폰트 세 파일의 실제 다운로드와 해시 검증, native/static build 및 브라우저 실행을 통과했다. 빌드 후 같은 prepare를 재실행해 검증된 캐시 재사용도 통과했다. 전역 pnpm/브라우저 캐시는 재사용 가능하므로 새 OS나 다른 실물 컴퓨터의 검증으로 주장하지 않는다.

최종 구성에서 준비 도구 21개, TS 단위/계약/통합 794개, 정적 host 51개(반대 native 경로 25개 skip), DPR 1/1.5/2 세 개, Chromium 153 및 설치된 Google Chrome 154의 8작품 actual Ren’Py 진입을 확인했다. 표지를 편집한 기존 흥부는 227/225컷을 엔딩까지 재생하고 슬롯·기록·재시작·편집 복귀와 archive 전체 일치를 확인했다. 타입·린트·정적 build·production audit와 1341개 미디어 해시가 통과했다. TS coverage는 statement 93.20%/branch 89.66%/line 97.84%이며 구성된 package/web-lib 범위다. React/Python 전체 coverage로 확대해 주장하지 않는다. 개발 의존성 braces의 기존 미수정 경고는 남는다.

검증 중 SDK 재생성 bytecode 오인, 표지 글꼴의 native 중복 복사, 정적 export 캐시의 오래된 runtime, 소개 재방문 직후 100ms 저장 경합, `/probe`의 Next payload 폴더 우선 문제를 수정했다. 관련 실패 사례를 먼저 확인한 뒤 수정 및 회귀 검사를 통과했다. 독립 코드/보안 검토에서 지적된 manifest 추가 파일·정적 runtime 비교 문제도 수정했으며 최종 중대 지적은 없었다.

[완료 감사와 범위](evidence/reproducible-test-environment/completion-audit.json), [통합 verify 로그](evidence/reproducible-test-environment/verify.log), [전체 host](evidence/reproducible-test-environment/host-regression.log), [DPR](evidence/reproducible-test-environment/dpr.log), [Chrome 8작품](evidence/reproducible-test-environment/chrome-eight-entry.log), [재실행 prepare](evidence/reproducible-test-environment/repeat-prepare.log). 로그의 기기 경로는 placeholder로 정규화하고 반복 진행률·HTTP access 줄은 생략했다.

[흥부 고정 입력](evidence/reproducible-test-environment/heungbu-native-input.knolstory)과 [native 경로 기록](evidence/reproducible-test-environment/heungbu-native-reading.json)은 같은 project ID와 SHA256을 확인해 별도 보관했다. 뒤의 host 검사가 표지 파일을 다시 생성해도 native 입력이 바뀌지 않는다. 그림이 들어간 실제 화면과 trace는 local/ignored 상태다. 무료 공개 release gate는 1280개 미확인 distributed media 때문에 exit1로 차단됨을 확인했으며 공개 배포하지 않았다.

자체 점검(agent-self-evaluation): 정확성 4/5(실제 native/해시·파일 일치; 물리 기기 제외), 완결성 4/5(대상 흐름/자동화 완료; Windows/학교 기기 별도), 명확성 4/5(공개 source CI와 권한 로컬 native 구분), 실행 가능성 4/5(단일 준비·복구·이동 안내; 레거시 기존 권한 필요), 간결성 4/5(기존 감사 유지, 재현 근거만 분리). 평균 4.0/5. 다음 검증은 실제 학교 기기의 입력/성능과 공개 미디어 권리 증빙이다.


2026-10-08 화면 정정: 준비 도구의 같은 복원 명령이 목재 방/선반/상판 화분/전경 2개/사각 포스터 4개/로고의 UI 10개를 추가로 복원한다. 서재의 검색·새 작품·파일 가져오기는 접힌 작품 관리에서 연다. 원본 첨부 소개 구도와 현재 옹고집 표지 호환 및 이번 검증은 [디자인 정정 문서](library-book-design-parity.md#2026-10-08-첨부-원본-소개와-조용한-서재-상단-정정)에 기록한다. 이전 감사 수치는 당시 실행의 기록이다.
