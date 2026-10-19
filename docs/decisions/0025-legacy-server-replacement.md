# ADR 0025 — 구 놀스토리 서버 폐기와 Next 신규 운영 환경

Status: Accepted direction (2026-10-17); 실제 삭제 대상의 최종 확정 및 공개 전환은 미실행.

## 사용자 결정과 대체 범위

사용자는 구 놀스토리 서버를 모두 없애고 뉴놀스토리 서버로 대체하거나 새롭게 구성하기를 요청했다. 기존 회원·작품·DB 처리 선택은 **기존 데이터까지 영구 삭제 — 정확한 삭제 대상 확인 후 별도 확정**이다. 따라서 기존 데이터 이전이나 영구 백업 보관을 기본값으로 추가하지 않는다. 이 선택은 아래 자원의 삭제를 이미 실행하라는 최종 확인이 아니다.

ADR0023의 기존 서버 보존은 독립 개발 중 사고 방지 조건이었다. 장기 병행 운영 방향은 이 결정으로 대체한다. 새 서비스 확인 전의 임시 보존, 다른 서비스와 공유 관리 경로 보호, Next 원고·자료·미커밋 변경 보존은 유지한다. 구 저장소 소스 및 브라우저의 legacy 저장소 삭제는 서버 철거 범위에 포함하지 않는다.

## 실제 확인한 교체 대상

2026-10-17 로컬 Docker context `desktop-linux`의 이름·Compose 라벨·볼륨·네트워크와 Cloudflare 로그인 대시보드를 읽기 전용으로 확인했다. 비밀 값은 읽거나 기록하지 않았다.

| 구 자원 | 확인한 대상 | 처리 경계 |
|---|---|---|
| 운영 앱/DB | `knolstory-stg-live-app-1`, `knolstory-stg-live-db-1` | 새 서비스 검증 후 중단/철거 후보 |
| 검증 앱/관리자/DB | `knolstory-stg-verification-app-1`, `knolstory-stg-verification-admin-1`, `knolstory-stg-verification-db-1` | 구 검증 서비스 철거 후보 |
| 운영/검증 데이터 볼륨 | `knolstory-stg-live_pg_data`, `knolstory-stg-verification_pg_data` | 영구 삭제 전 정확한 대상 재확인 및 최종 확정 |
| 구 네트워크 | `knolstory-stg-live_database`, `knolstory-stg-live_outbound`, `knolstory-stg-verification_database`, `knolstory-stg-verification_outbound` | 연결 자원이 없는지 확인 후 전용 자원만 제거 |
| 중지된 검사/복원 컨테이너 | `knolstory-audit-test-20261005`, `knolstory-restore-check-20261005`, `knolstory-restore-check-20261001-final`, `knolstory-restore-check-20261001-0330`, `knolstory-restore-check-20260930`, `knolstory-restore-check-20260929` | 각 연결 볼륨·원본 백업 파일을 포함한 최종 목록을 별도 대조. 이번 확인만으로 백업 전체 발견을 주장하지 않음 |
| 운영 화면 | `story.knolquiz.com` CNAME → `story-maker-5b1.pages.dev` | Next 화면 연결로 교체. Pages 프로젝트 삭제는 다른 사용처 확인 후 범위 확정 |
| 검증 화면 | `story-stg.knolquiz.com` CNAME → `codex-library-account-entry.story-maker-5b1.pages.dev` | Next 검증 경로 결정 후 구 연결 정리 |
| 구 API 전달 | `story-stg.knolquiz.com/api/v1/*` → Worker `knolstory-stg-app-api` | Worker의 `APP_ORIGIN`은 검증 주소, `TUNNEL_ORIGIN`은 `https://story-stg-origin.knolquiz.com`. Next 전달 경로 준비 후 교체/정리 |
| 구 Tunnel 서비스 | `story-stg-origin.knolquiz.com` → `http://127.0.0.1:4000` | Next 서비스 대상으로 좁게 전환 |

## 보호 대상

- Tunnel `knolstory-stg`는 확인 당시 Healthy이며 `mini-ssh.knolquiz.com` → `ssh://localhost:22`도 함께 제공한다. Tunnel 전체 및 SSH 경로를 삭제하지 않는다.
- Next API/테스트 DB/자료, 다른 앱의 Supabase·workmachine·cloudflared, 소유권을 확인하지 않은 익명 볼륨은 삭제 대상이 아니다. 광역 prune을 사용하지 않는다.
- 기존 카카오 개발자 앱 재사용은 서버 DB 이전과 별개다. 앱 삭제/연결 해제/키 재발급은 이번 철거에 포함하지 않는다. 같은 앱의 기존 카카오 사용자가 Next 빈 DB에서 새 내부 계정으로 가입되는 동작을 명시적으로 검증한다.

## 실행 순서

1. 신규 Next 운영 Compose·DB·전용 자격정보·네트워크·볼륨을 준비한다. 현재 `knolstory-next-storage-test`에는 합성 계정/테스트 문서가 있으므로 운영 DB로 승격하지 않는다. 구 데이터는 자동 이전하지 않는다.
2. 정적 Web/Ren'Py와 `/api/*`를 같은 공개 origin으로 제공하는 운영 진입점을 준비한다. `web-api-proxy.mjs`는 loopback HTTP/Host만 허용하는 개발용이다. `15401`을 그대로 공개 Tunnel에 연결하거나 Host 우회로 공개 환경을 가장하지 않는다.
3. 카카오 설정을 서버 비밀 파일로 연결하고 승인된 검증 주소에서 실제 가입/재로그인/로그아웃·저장/재열기·소유권 거부를 확인한다. 운영 주소는 `https://story.knolquiz.com`, callback은 `/api/v1/auth/kakao/callback`이다. 공개 기준 주소·Secure 쿠키·CSRF·redirect를 일치시킨다.
4. 화면 및 API의 Cloudflare 변경 후보를 제시하고 운영 트래픽을 Next로 전환한다. 전환 후 실제 주소에서 OAuth·작품 저장/읽기·runtime 자료 전달을 확인한다. 기존 검증 Worker 라우트 하나의 변경을 전체 전환으로 주장하지 않는다.
5. 구 서버를 중단한다. 컨테이너·볼륨·외부 설정·백업 파일·비밀 파일의 정확한 정리 목록 및 공유 사용처를 최종 확인한다. 사용자가 그 목록의 영구 삭제를 확정한 뒤 해당 자원만 삭제한다. 삭제 전 자동 백업을 추가해 영구 삭제 의도를 무효화하지 않는다.

이 결정은 서버 교체 방향을 확정한다. 학급·제출·공유·Next 데이터 보관 정책이나 제품 전체 출시 검증을 대신하지 않는다. 현재 실행 상태와 재개 지점은 [단일 실행 계획](../architecture/product-completion-plan.md)이 소유한다.
