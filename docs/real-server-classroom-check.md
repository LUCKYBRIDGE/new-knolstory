# 실제 서버로 학급 과제 이어 쓰기 검사

저장소 루트에서 실행한다.

```sh
pnpm test:classroom:real
```

Node.js 22.13 이상, pnpm, 로컬 Unix 소켓으로 연결되는 Docker가 필요하다.
의존성이나 Playwright Chromium이 없으면 명령에서 설치한다. Linux에서
Chromium 시스템 라이브러리가 빠져 있으면 `pnpm exec playwright install-deps chromium`으로 준비한다.

검사는 임시 네트워크에서 PostgreSQL 16에 스키마를 적용하고 임시 교사 세션을 만든다.
로컬의 `knolstory-next-api:production` 이미지로 별도 API 컨테이너를 실행하며,
이미지가 없으면 현재 체크아웃의 `server/Dockerfile`로 임시 이미지를 만든다.
PostgreSQL은 호스트 포트를 열지 않는다. API, 게이트웨이, 웹 개발 서버는 각각
루프백의 15400, 15401, 15402번 포트를 사용한다. 세 포트가 비어 있어야 한다.

Playwright가 교사·학생 브라우저 세션을 따로 열어 과제 생성, 학생 로그인·제출,
교사 통과, 그림책을 가져와 글만 편집하는 단계까지 확인한다. 실패하면 단계 이름과
오류를 표시하고 종료 코드가 0이 아닌 값으로 끝난다. 성공·실패·일반 중단 시
이 실행이 만든 컨테이너, 네트워크, 서버 프로세스, 임시 파일과 임시 빌드 태그를 정리한다.
