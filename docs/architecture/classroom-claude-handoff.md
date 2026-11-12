# 클로드 인수인계 · 학급 미션과 QR 인쇄

2026-11-12 작업본. 같은 `new-knolstory` 체크아웃을 열고 `git status --short`부터 확인한다. 기준 브랜치는 `codex/trusted-client-rate-20261103`, HEAD는 `60b9ca71`이다. 아래 변경은 커밋되지 않았으며 GitHub에는 이 작업본이 없다. 다른 컴퓨터나 클라우드 세션에서 재개하려면 이 로컬 변경을 먼저 전달해야 한다.

기존 미커밋 원고·자산·런타임·서재·학급 작업과 신규 파일을 보존한다. `.claude/`는 기존 사용자 작업 영역이다. 브랜치를 초기화하거나 작업 디렉터리 전체를 일괄 스테이징하지 않는다. [현재 상태](../../STATUS.md), [화면 기준](../../DESIGN.md), [학급 계약](classroom-design.md), [문서 관리](documentation-governance.md)를 읽고 필요한 범위만 수정한다.

## 지금 있는 코드와 검증

- 학생 QR 인쇄는 `apps/web/lib/qr-print-layout.ts`, `apps/web/components/classroom/student-qr-print.tsx`와 CSS에 있다. 가로 1–5열, 세로 1–6행, 기본 3×4다. 4×6은 30명일 때 24명과 6명으로 나뉜다. 6행에서는 반복 촬영 안내를 생략해 QR과 긴 이름의 공간을 확보한다. QR 모듈이 0.5mm 미만이면 인쇄를 제한하는 기존 기준을 유지한다.
- QR/미션 입력 검증 단위 9개, `pnpm typecheck:server`, 온라인 정적 빌드를 이 인계 시점에 통과했다. `tests/e2e/classroom.spec.ts`의 `teacher prints a complete class in portrait and square A4 grids`에 4×6 검사도 추가해 통과했다. [4×6 A4 예시 PDF](evidence/student-qr-print-2026-11-12/student-qr-4x6.pdf)는 검증용 학생과 주소를 사용한다. PDF를 200dpi 이미지로 변환해 1쪽 24개, 2쪽 6개 QR이 모두 해당 검증용 주소로 판독되는 것을 확인했다. 실제 프린터와 휴대폰 카메라는 별도 확인 범위다.
- 미션 서버 초안은 `server/classroom/mission-contract.ts`, `mission-service.ts`, `errors.ts`, `server/migrations/011-classroom-missions.sql`에 있다. `createClassroomService`와 migration runner에 연결되어 있다. 계약 테스트는 있지만 HTTP 라우트, 권한·요청 검증, 격리 DB 통합 검증은 아직 남아 있다.
- 학생 UI 초안은 `apps/web/components/classroom/student-missions.tsx`와 CSS에 있다. `apps/web/lib/mission-api.ts`는 학생 목록·확인 요청 클라이언트와 읽기 URL을 정의한다. 이 컴포넌트는 아직 학생 대시보드에서 렌더링하지 않는다. `submitMission`의 현재 응답은 `{submittedAt}`이며 학생 UI는 이 값으로 확인 대기 상태를 표시한다. 교사용 클라이언트와 화면, 기본 미션 자료는 아직 없다.

## 이어서 구현할 순서

1. `server/http/classroom-routes.ts`에 `/api/v1/class/classroom/missions` 아래 경로를 연결한다. 목록 `GET`은 교사·학생, 생성 `POST`와 `PATCH /{id}`는 교사, `PUT /{id}/submission`은 학생, `GET /{id}/progress`와 `PUT /{id}/progress/{number}`는 교사다. 서비스 메서드와 실제 반환값을 기준으로 한다. 기존 일반 JSON 상한은 16KiB다. 최대 8문항×2,000자의 한글 답변과 메모가 들어갈 수 있도록 미션 제출 전용 요청 상한을 정하고 경계값을 검사한다. 기존 CSRF, 역할, 학급 범위, 요청 제한을 재사용한다. 계정 간 격리, 마감, 같은 시각의 재제출, 최신 답변 확인 전 통과 방지, 직접 통과 및 피드백을 라우트와 격리 PostgreSQL에서 확인한다.
2. 교사 과제 영역에 ‘미션’을 추가한다. `직접 만들기`와 `놀스토리 제공 미션 가져오기`를 제공하고, 제공 미션은 복사한 뒤 제목·안내·통과 기준·질문을 고쳐 배정할 수 있게 한다. 읽기·독후 활동지·자유 미션을 지원한다. 작품별 예시에는 기억나는 장면, 인물의 선택과 근거, 다른 전개를 생각하는 질문을 넣는다. 교사는 학생 답변을 읽고 `통과`, `다시 쓰기`, `확인 상태 지우기`를 선택한다. 종이 활동지와 교실 활동은 온라인 답변 없이도 교사가 통과시킬 수 있다. 새 제출로 바뀐 경우 `MISSION_SUBMISSION_CHANGED`를 처리해 새 답변을 확인하게 한다.
3. 학생의 ‘내 과제’에서 미션 초안을 연결한다. 읽기 링크로 지정 작품의 원작·놀스토리·숏스토리 판본을 열고 답변이나 읽기 메모를 제출한다. 숏스토리 URL은 기존 읽기 진입을 사용한다. 메인 `readWork`와 `readEdition`은 클라이언트가 만든 **제안 URL**이며 현재 `story-workspace.tsx`가 아직 처리하지 않는다. 기존 공식 작품 열기와 원고 보호를 재사용하고 읽기 화면에서 미션으로 돌아올 수 있게 한다. 읽거나 제출하면 확인 대기, 교사가 통과시키면 미션 성공이다. 재제출하면 확인 대기로 돌아가고 이전 피드백은 계속 표시한다.
4. 교사 제공 미션 가져오기·직접 생성 → 학생 읽기·활동지 제출 → 교사 다시 쓰기 → 학생 재제출 → 교사 통과 → 학생 성공 표시를 브라우저에서 검증한다. 수기 확인과 계정 전환도 검사한다. 완료 증거가 생기면 [학급 계약](classroom-design.md)과 [현재 상태](../../STATUS.md)를 갱신한다.

배포는 별도 단계다. 운영 후보에는 migration 009·010·011과 같은 소스의 API·온라인 Web 빌드를 맞춰야 한다. 앞서 기록한 원고·삽화·재생 및 학급 회귀 검증은 관련 변경이 있을 때만 다시 실행한다.

## 2026-11-12 이어서 한 작업

위 1–4를 구현하고 검증했다. 결과와 범위는 [현재 상태](../../STATUS.md)의 ‘학급 미션’ 항목, 계약은 [학급 계약](classroom-design.md)의 ‘학급 미션’ 절에 있다. 미션 통합 검증은 `server/classroom/mission.integration.ts`, 브라우저 검증은 `tests/e2e/classroom.spec.ts`의 미션 5개다. 모든 변경은 여전히 커밋 전이다.
