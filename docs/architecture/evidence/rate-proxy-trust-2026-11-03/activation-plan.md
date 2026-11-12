# 요청 제한 후보의 운영 전환 초안

이 문서는 검토용 초안이다. 현재 후보는 미커밋·미배포이며, 앞서 받은 이미지 미리 받기 배포 승인은 이 전환을 포함하지 않는다. 현재 운영과 기존 원고·세션·DB를 유지한다.

## 현재 검토할 고정 묶음 — 2026-11-04

[후보 소유 기록](candidate-activation-checkpoint-2026-11-04.json)은 정확한 API/ingress imageID, 실제 내부망/UID501 검사, private compose, 고정 Worker payload와 되돌릴 현재 version을 연결한다. native 실행 파일과 미설치 plist는 [공식 runtime 기록](official-runtime-checkpoint-2026-11-04.json)을 따른다. 실제 키는 아직 없으며 값을 초안/로그/커밋에 넣지 않는다. 운영 경로는 바꾸지 않았다.

승인 범위는 현재 소스·검증 기록의 커밋/main 반영, 별도 증명 키와 native 관리형 gateway, 고정 API/ingress, Worker 헤더 정리, 소유한 두 Tunnel service다. 기존 이미지 미리 받기 승인은 이 묶음에 재사용하지 않는다. API/ingress는 `--no-deps --no-build`로만 교체하며 DB/migration은 실행하지 않는다. 이번 정적 파일은 이미 배포한 것과 같으므로 새 Pages 배포를 만들지 않는다.

승인 후에도 실제 변경 전에 원격 Worker/Tunnel 구성과 서비스/파일 상태를 다시 읽고 private 백업·이전 이미지/구성·되돌리기 자료를 확인한다. 현재 서명 없는 TCP 공개 경로와 엄격 API 전환 사이에는 짧은 API 중단이 가능하다. native gateway가 새 중계를 통과하는지 확인한 뒤 소유한 두 경로만 전환한다. 공개 요청의 실제 서명/헤더와 같은 출처 인증은 적용 후 검증이며 로컬401/403로 대체하지 않는다.

## 확인한 연결과 선택한 후보

- native Mac cloudflared의 UID는 501이고 API 컨테이너는 `501:20`, 현재 ingress 컨테이너는 `node`다. API의 호스트 포트는 없다.
- 제한된 과거 로그에서 story 두 도메인이 loopback15501로 연결되고 다른 호스트 두 개도 같은 Tunnel을 사용했다. 기존 CLI GET은401/1001이었다. 이후 사용자 승인된 브라우저 조회로 2026-11-04 최신 구성GET200·version4를 확인했다. [현재 조회와 로컬 초안](tunnel-current-2026-11-04.json)은 두 story service가 현재도 loopback15501임을 확인하며 다른3규칙을 보존한다. 전체 원문·초안은 비공개0600이고 적용하지 않았다.
- Docker 내부 named volume 소켓은 native Mac 프로세스가 바로 사용할 수 있는 경로가 아니다. 기존 검사는 Linux UID 권한의 근거로 보존한다.
- 선택한 후보는 native UID501의 보호된 UDS gateway → 기존 Docker TCP ingress의 서명 검증 중계 → API 재검증이다. 정적 요청도 같은 Docker 빌드로 스트리밍해 기존 Worker 우회 시의 전달 경로를 유지한다.
- 공유 cloudflared의 이동·중지·재시작, 새 Tunnel/DNS, 다른 호스트의 경로 변경은 이 범위에 넣지 않는다.

## 운영 변경 전에 반드시 갖출 근거

1. 최신 원격 Tunnel 구성을 읽을 수 있어야 한다. 전체 원문은 비공개로 보관하고 정확한 version·해시·소유한 두 규칙을 확인한다. 브라우저 읽기 전용 조회 gate는 충족했다. 실제 적용 직전에 다시 조회해 version/해시가 같은지 확인해야 한다.
2. 검토된 소스·같은 정적 빌드의 API/ingress 이미지·native gateway 패키지를 고정한다. gateway를 dirty checkout에서 직접 상시 실행하지 않는다. [로컬 고정 패키지와 미설치 plist 검사](sealed-bundle.json)는 완료했으며 실제 운영 경로·Node 갱신 시 경로·서비스 등록·재시작은 별도다. 초안은 `KeepAlive=false`이고 기존 소켓 확인 뒤 명시적으로 복구한다. 자동 장애 복구를 증명한 것으로 확대하지 않는다.
   2026-11-04 읽기 전용 사전 검사에서 현재 Homebrew Node의 상위 경로 중 그룹 쓰기 가능1곳을 확인했다. 기존 초안의 Node 경로를 그대로 승인하지 않는다. 후속 [공식22.23.4후보](official-runtime-checkpoint-2026-11-04.json)의 서명·해시·직접 시스템 의존성·새 개인 경로와 gateway fixture를 확인하고 미설치 plist를 새로 생성했다. 실제 설치 직전에 선택한 실행 파일·패키지·키/소켓/로그와 서비스 이름을 다시 확인해야 한다. [호스트 검사](preflight-host-2026-11-04.json)는 서비스 이름 충돌이 없음을 관찰했지만 실제 키는 만들지 않았다.
3. 별도 새 키 파일을 사용할 계획과 UID501의 최소 읽기 권한을 확인한다. 운영 키 생성·마운트·ingress의 UID 변경은 별도 승인 대상이다. 기존 OAuth/DB/CSRF 키를 재사용하거나 출력하지 않는다.
4. 검토된 Worker 후보의 정상 origin 전달과 설정 오류 경로가 최초 CF 값으로 `X-Real-IP`를 정리하는지 확인한다. Worker 자체를 건너뛰는 한도 초과 fail-open도 실제 Tunnel에서 확인해야 한다. 로컬 CF 시험값을 진짜 edge 출처의 증거로 확대하지 않는다.
5. 이전 API/ingress 이미지·설정, 원래 두 service 값, 현재 DB 상태와 되돌리기 담당 절차를 보존한다. 이 변경은 migration이나 세션 초기화를 필요로 하지 않는다.

## 검토할 변경 묶음과 적용 순서

운영 적용 전 별도 승인은 새 키·native 관리형 gateway·API/ingress 설정·Worker 후보·소유한 두 Tunnel service 변경을 명시해야 한다. 실제 적용 명령은 위 전제가 충족된 뒤 정확한 소스/설정에 묶어 작성한다. 지금 원격 수정이나 상시 실행 명령을 실행하지 않는다.

1. 새 키 파일과 고정 gateway 패키지를 준비하고 별도 시험 UDS에서 정적 전달·서명·시간·UID·종료를 확인한다. 기존 공개 경로는 유지한다.
2. Worker의 헤더 정리 후보를 반영하고 기존 전달과 인증 경로가 유지되는지 확인한다. 이 단계만으로 API의 서명 모드를 켰다고 기록하지 않는다.
3. API의 엄격 검증과 ingress의 검증 중계를 같은 변경 구간에서 맞춘다. 기존 TCP 경로에서 서명 없는 API 요청을 거부할 수 있으므로 짧은 중단 가능성을 명시한다. 무중단 배포를 주장하지 않는다.
4. native gateway가 canonical Host의 서명 API와 정적 전달을 실제 새 ingress까지 통과하는지 먼저 확인한다. 실패 시 Tunnel은 바꾸지 말고 기존 API/ingress로 되돌린다.
5. 최신 Tunnel 구성을 다시 읽고 초안과의 version/해시 차이를 검사한다. `planStoryTunnelRoutes`는 두 소유 service만 UDS로 바꾸고 다른 규칙·순서·전역 설정을 보존한다. 차이가 있으면 새 초안을 만든다.
6. 원격 API의 원자적 조건부 갱신은 증명하지 못했다. 사전 해시 비교가 이후의 동시 수정을 막는다는 주장을 하지 않는다. 다른 운영자의 변경이 없는 전환 구간을 확보하고, 적용 직후 다시 읽어 소유한 두 service 외 차이가 없는지 확인해야 한다.
7. 실제 공개 주소의 익명401·정상 설정·기존 세션·정적 핵심 해시·native 재생과 사용자 인증 업로드의 필요한 범위를 확인한다. 실패 시 아래 순서로 되돌린다.

## 되돌리기 순서

1. gateway를 먼저 중단하지 않는다. 기존 proof 미사용 API/ingress 이미지와 설정을 복구해 UDS를 통해서도 기존 제한·인증 동작으로 돌아오게 한다.
2. 최신 원격 설정의 다른 규칙을 보존하면서 소유한 두 hostname의 service만 기존 loopback15501로 복구한다. 엄격 API를 남긴 채 Tunnel만 TCP로 돌리지 않는다.
3. 정적·API·세션 동작과 다른 규칙의 불변을 확인한 뒤 작업 소유 gateway만 중단한다. 공유 cloudflared와 다른 서비스는 그대로 둔다.
4. 기존 소켓이 남으면 현재 listener 부재·소유자·경로를 확인한다. 파일이 있다는 이유만으로 자동 삭제하거나 상위 디렉터리 권한을 고치지 않는다.

## 현재 검증과 남은 범위

[체크포인트](checkpoint.json), [실제 host→Docker 시험](host-docker-boundary.json), [읽기 전용 Tunnel 감사](host-tunnel-boundary.json)를 따른다. 시험용 키·가짜 세션/CF 값·정적 fixture를 쓴 검사는 운영 자격증명이나 실제 OAuth·Cloudflare 헤더·전체 작품 검증이 아니다. 이전 이미지 배포와 전체 제품의 기기·장기 오프라인·학급/공유 정책 큐도 유지한다.
