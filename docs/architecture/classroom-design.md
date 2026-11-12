# 학급·교사·학생 계정 설계 — 2026-11-10 사용자 결정

이 문서는 학급 기능의 정식 계약이다. 서버(`server/`)와 웹(`apps/web/`)은 아래 API·데이터 규칙을 그대로 따른다. 교사 등록과 학급 참여는 이 결정으로 확정한다. 학급 안의 제출본 열람 권한을 적용하며 외부 공개 링크의 범위는 별도다. 보관 기간(Q-03)은 계속 미결이다.

## 1. 역할과 저장

| 역할 | 만드는 방법 | 로그인 | 작품 저장 |
|---|---|---|---|
| 손님(로그인 안 함) | — | — | 이 기기(브라우저 임시 보관·작품 파일). 개수 제한 없음 |
| 일반 계정 `member` | 카카오 가입(기존) | 카카오·연결한 Google | 이 기기에만. **내 작품은 최대 3개** |
| 교사 `teacher` | 일반 계정이 **교사 등록 코드** 입력 | 카카오·Google | 이 기기 + 온라인(기존 개인 작품 API) |
| 학생 `student` | 교사가 학급에서 생성(최대 30개) | **학급 코드 + 번호 + 비밀번호**, 또는 교사가 만든 **QR 즉시 접속** | 이 기기에 여러 작품. 온라인은 **열린 과제의 제출란 하나에만** |
| 관리자 `admin` | 서버 설정 `KNOL_ADMIN_ACCOUNT_IDS`(쉼표로 구분한 계정 ID) | 카카오·Google | 교사와 같음 + 교사 등록 코드 변경 |

- 온라인 기능 전체는 `NEXT_PUBLIC_KNOL_ONLINE=1` 빌드에서만 보인다(기본은 로컬 전용).
- 일반 계정의 3개 제한은 웹 서재에서 새 작품 만들기·사본 만들기·가져오기를 막는 방식으로 적용한다. 기존 작품은 지우지 않는다.

## 2. 코드 두 가지

- **교사 등록 코드**: 운영자가 교사에게 주는 코드. 하나만 존재하며 관리자가 바꾼다. 서버는 해시만 저장한다. 바꾸면 이전 코드는 즉시 무효.
- **학급 코드**: 교사가 학급을 열 때 서버가 만든다. 영문 대문자·숫자 6자(헷갈리는 0/O/1/I 제외). 교사가 새로 만들 수 있으며, 바꾸면 학생 로그인에 새 코드를 써야 한다.

## 3. 학급과 학생

- 교사는 학급을 **하나** 연다(이름 필수).
- 학생 계정은 학급 안에서 **번호 1–30**으로 만든다. 교사는 `count`만큼 비어 있는 번호에 한꺼번에 만들 수 있다. 각 학생에게 초기 비밀번호(숫자 4자리)가 생긴다.
- 교사는 학생의 **이름(표시용)·비밀번호를 보고 바꿀 수 있다.** 비밀번호는 서버 비밀키(`KNOL_CLASSROOM_SECRET`, 32바이트 base64)로 AES-256-GCM 암호화해 보관하고, 로그인 확인은 별도의 scrypt 해시로 한다.
- **QR 즉시 접속**: 교사가 학생별 QR을 만들면 서버가 재발급 가능한 접속 키를 만든다. 새 키는 CSPRNG 20바이트(160비트)·Base64URL 27자이며 QR 주소는 `{origin}/?q={token}`이다. 기존 32바이트·43자 키와 `?class-login=` 주소도 계속 로그인할 수 있다. 서버는 해시로 로그인 대상을 찾고, 재인쇄에 필요한 키는 AES-256-GCM으로 암호화해 보관한다(AAD `qr:{studentAccountId}`). 개별 재발급은 이전 QR을 무효화한다. 키에 학생 이름·학급 정보·비밀번호를 넣지 않는다.
- 학생 로그인 실패는 같은 학급 코드·번호 기준으로 제한한다(기존 요청 제한 사용).

## 4. 편집 허용 범위

교사는 학급 기본값을 정하고, 학생별로 덮어쓸 수 있다. 여러 학생을 골라 한 번에 적용할 수 있다. 적용 우선순위: 학생별 설정 > 학급 기본값 > 전체 허용.

```ts
type EditingPermissions = {
  text: true;               // 글은 항상 허용
  images: boolean;          // 배경·인물 이미지 고르기(배경·인물 편집화면, 기본편집의 이미지)
  characters: boolean;      // 인물 배치 편집화면
  audio: boolean;           // 음향 편집화면·장 기본 음향
  direction: boolean;       // 연출 편집화면
  choices: boolean;         // 선택지·점수·분기조건
  newWorks: boolean;        // 새 작품 만들기·가져오기 허용
  forcedStoryKey: string | null; // 지정하면 학생은 이 작품(제공 작품 키)의 내 사본만 편집
};
```

- "이미지와 글만"은 `images:true, characters:false, audio:false, direction:false, choices:false` 같은 조합이다. 웹은 대시보드에서 자주 쓰는 묶음(글만 / 글·이미지 / 전체)을 버튼으로 제공한다.
- 웹 편집기는 허용되지 않은 편집화면을 목록에서 빼고, 해당 편집 설정 개방을 막는다. 이미 원고에 들어 있는 음향·연출은 지우지 않고 그대로 재생된다.

## 5. 과제와 제출

- 교사는 놀스토리·숏스토리 유형을 선택해 과제를 만든다(제목, 설명, 선택: 바탕 작품 키). 생성 후 유형은 바꾸지 않는다. 과제는 `열림/닫힘` 상태를 가진다.
- 학생은 **열린 과제마다 제출란 하나**에 자기 작품 하나를 온라인 저장(제출·다시 제출)할 수 있다. 닫힌 과제는 읽기만 된다.
- 제출 작품은 과제와 같은 유형이어야 한다. 다른 유형은 `422 ASSIGNMENT_FORMAT_MISMATCH`로 거절하며 이전 제출본을 보존한다.
- 제출 본문은 기존 문서 검증(`server/documents/validation.ts`)을 통과한 작품 문서 JSON이다(기존 크기 제한 사용).
- 교사는 과제별 제출 목록(학생 번호·이름·제출 시각)을 보고 제출 작품을 열 수 있다(웹은 기기에 사본으로 연다).

## 6. API (모두 `/api/v1/class` 아래, JSON, 기존 세션 쿠키·CSRF 규칙 사용)

응답 형식은 기존 문서 API와 같다: `{success:true,data}` / `{success:false,error:{code}}`.

| 메서드·경로 | 권한 | 요청 | 응답 `data` |
|---|---|---|---|
| GET `/me` | 로그인 | — | `{role, account:{id}, classroom?:ClassroomSummary, student?:{number,name,classId,className,permissions:EditingPermissions}}` |
| POST `/teacher-upgrade` | member | `{code}` | `{role:'teacher'}` · 틀리면 403 `INVALID_TEACHER_CODE` |
| GET `/admin/teacher-code` | admin | — | `{updatedAt}` (코드 자체는 돌려주지 않음) |
| PUT `/admin/teacher-code` | admin | `{code}` (6–32자) | `{updatedAt}` |
| POST `/classroom` | teacher(학급 없음) | `{name}` | `Classroom` |
| GET `/classroom` | teacher | — | `Classroom` (학생 목록·비밀번호 포함) |
| PATCH `/classroom` | teacher | `{name?, regenerateCode?:true, defaultPermissions?}` | `Classroom` |
| POST `/classroom/students` | teacher | `{count}` (1–30, 빈 번호 순서대로) | `Classroom` |
| PATCH `/classroom/students/{number}` | teacher | `{name?, password?, permissions?:EditingPermissions\|null}` | `Student` |
| POST `/classroom/students/permissions` | teacher | `{numbers:number[], permissions:EditingPermissions\|null}` | `Classroom` |
| DELETE `/classroom/students/{number}` | teacher | — | `Classroom` |
| POST `/classroom/students/{number}/qr` | teacher | — | `{url}` (새 토큰, 이전 무효) |
| POST `/classroom/qr-print` | teacher | `{numbers:number[], replaceExisting?:true}` | `{className,classCode,cards:{number,name,url}[]}` |
| POST `/student-login` | 손님 | `{classCode, number, password}` | `{role:'student'}` + 세션 쿠키 |
| POST `/qr-login` | 손님 | `{token}` | `{role:'student'}` + 세션 쿠키 |
| GET `/classroom/assignments` | teacher·student | — | `Assignment[]` (학생은 자기 제출 상태 포함) |
| POST `/classroom/assignments` | teacher | `{title, description?, storyKey?, format?:'knolstory'|'shortstory'}` | `Assignment` |
| PATCH `/classroom/assignments/{id}` | teacher | `{title?, description?, open?}` | `Assignment` |
| GET `/classroom/assignments/{id}/submissions` | teacher | — | `{number,name,submittedAt}[]` |
| GET `/classroom/assignments/{id}/submissions/{number}` | teacher | — | `{document, submittedAt}` |
| PUT `/classroom/assignments/{id}/submission` | student(열린 과제) | `{document}` | `{submittedAt}` |
| GET `/classroom/assignments/{id}/submission` | student | — | `{document, submittedAt}` 또는 404 |

```ts
type ClassroomSummary = {id:string; name:string; classCode:string; studentCount:number};
type Student = {number:number; name:string; password:string; permissions:EditingPermissions|null; hasQr:boolean};
type Classroom = ClassroomSummary & {defaultPermissions:EditingPermissions; students:Student[]};
type Assignment = {format:'knolstory'|'shortstory'; id:string; title:string; description:string; storyKey:string|null; open:boolean; createdAt:number; submittedAt?:number|null};
```

- 학생은 개인 작품 API(`/api/v1/documents`)를 쓸 수 없다(403 `ROLE_NOT_ALLOWED`). 일반 계정도 쓸 수 없다. 교사·관리자만 쓸 수 있다.
- 오류 코드: `ROLE_NOT_ALLOWED`, `CLASSROOM_EXISTS`, `CLASSROOM_NOT_FOUND`, `STUDENT_LIMIT`, `STUDENT_NOT_FOUND`, `INVALID_LOGIN`, `INVALID_TEACHER_CODE`, `ASSIGNMENT_CLOSED`, `ASSIGNMENT_NOT_FOUND`, `ASSIGNMENT_FORMAT_MISMATCH`, `INVALID_DOCUMENT`, `INVALID_REQUEST`.

## 7. 데이터베이스 (migration `008-classroom.sql`·`009-assignment-format.sql`·`010-student-qr-print.sql`, 스키마 `knolstory_class`)

- `knolstory_auth.accounts`에 `role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','teacher','student'))` 추가. 관리자는 설정으로 판정한다.
- `teacher_codes(id smallint PK CHECK(id=1), code_hash, updated_at)`
- `classrooms(id uuid PK, teacher_account_id uuid UNIQUE, name, class_code UNIQUE, default_permissions jsonb, created_at)`
- `students(account_id uuid PK → accounts, classroom_id, number 1–30, name, password_hash, password_cipher, permissions jsonb NULL, qr_token_hash NULL UNIQUE, qr_token_cipher NULL, UNIQUE(classroom_id, number))`
- `assignments(id uuid PK, classroom_id, title, description, story_key NULL, format text, open bool, created_at)`
- `submissions(assignment_id, student_account_id, document jsonb, submitted_at, PK(assignment_id, student_account_id))`

009는 기존 제출물이 모두 숏스토리인 과제를 `shortstory`, 모두 놀스토리이거나 제출물이 없는 과제를 `knolstory`로 이전한다. 이전 요청에서 `format`을 생략하면 기본값은 `knolstory`다. 두 유형이 섞였거나 형식을 확인할 수 없는 기존 제출물이 있으면 과제 ID를 알리고 변경 전에 마이그레이션을 중단한다. 운영 반영 전 해당 과제를 기존 제출물과 학생 연결을 보존하며 분리하고 다시 적용해야 한다. 제출 원고를 덮어쓰거나 삭제하지 않는다.

## 8. 웹 화면

- 서재 상단 계정 메뉴: 역할에 따라 `교사 등록`(일반), `교사 대시보드`(교사), `내 학급·과제`(학생), `관리자`(관리자) 입구를 둔다.
- 첫 화면의 계정 입구 옆에 `학생 로그인`(학급 코드·번호·비밀번호). `?q=` 또는 기존 `?class-login=` 주소로 들어오면 바로 QR 로그인을 시도한다.
- **교사 화면**: `서재·과제·학생` 주 메뉴를 공통으로 표시한다. 과제(`/teacher`)는 유형별 과제 생성·목록·제출 확인, 학생(`/teacher?tab=students`)은 학생 생성·명단·계정/허용 관리, 별도 학급 설정(`/teacher?tab=settings`)은 학급 이름·접속 코드/변경·기본 편집 허용을 담당한다. 좁은 화면의 학생 목록은 세로 카드로 배치한다. 과제 목록 요청 실패는 로딩을 끝내고 재시도를 제공한다.
- **학생 화면**(`/student`): `서재·내 과제` 주 메뉴, 내 번호·이름, 놀스토리·숏스토리로 구분한 열린 과제 목록, 과제마다 `이 기기의 작품 고르기 → 제출`과 제출 상태, 내 편집 허용 범위 안내. 마감된 과제는 유형별 접힌 목록에 설명과 제출 상태가 남고, 이미 제출한 작품 파일을 받을 수 있다.
- **관리자**(`/admin`): 교사 등록 코드 바꾸기.
- 대시보드는 휴대폰·태블릿·PC에서 쓸 수 있게 하고, 비밀번호는 기본으로 가려 두고 `보기`를 눌렀을 때만 보인다.

교사의 놀스토리·숏스토리 제출 작품 열기는 해당 편집기의 기존 작품 가져오기 확인으로 이어진다. 적용하면 기기에 새 사본을 보관한다. 파일 받기는 실제 작품 형식에 맞는 확장자를 사용한다. 학생은 기기에 있는 놀스토리·숏스토리를 골라 제출한다. 학생의 제출 작품 선택에는 해당 과제와 같은 유형만 표시한다.


## 과제 쓰기와 재개

학생의 과제 카드에서 ‘과제 쓰기’를 누르면 서버의 최신 과제 목록으로 열림 상태와 바탕 작품을 확인한다. 학생별 지정 작품과 과제의 바탕 작품이 충돌하면 교사 확인을 안내한다. 지정 작품이 있으면 새 작품 만들기가 제한되어도 해당 과제의 사본은 시작할 수 있다. 자유 과제는 새 작품 만들기 허용이 필요하다.

과제 작성본은 기기에 독립 작품으로 저장한다. 계정 ID·과제 ID에 연결된 기기 키로 같은 작성본을 ‘이어서 쓰기’로 다시 연다. 새 작품 만들기가 이후 제한되어도 기존 작성본은 재개할 수 있다. 과제 유형에 따라 놀스토리 편집기 또는 숏스토리 쪽 편집기로 연결한다. 해당 작품이 기기에 없으면 새 사본을 만든다. 학생 화면은 과제·제출을 먼저 보여 주고 편집 허용 설명은 펼쳐 본다. 새 교사나 학생 계정으로 바뀌면 이전 계정의 학급·과제 상태를 닫고 새로 확인한다.

제출본 불러오기와 로컬 파일 가져오기는 같은 요청 순서를 사용한다. 계정이 바뀌었거나 다른 작품을 선택한 뒤 늦게 도착한 제출본은 적용하지 않는다. 이전 교사 계정의 제출 확인창도 새 계정에 노출하지 않는다.


## 학생 로그인 QR 일괄 인쇄 — 2026-11-12

학생 탭에서 전체 학생 또는 선택한 학생의 접속 카드를 준비한다. 서버는 학생 번호순으로 같은 교사 학급의 학생만 처리한다. 기존 암호문·해시가 일치하는 QR 키는 재사용하고 없는 키만 발급한다. 이전 해시 전용 QR은 복원할 수 없으므로 기본 요청을 `409 QR_REISSUE_REQUIRED`로 중단한다. 교사가 기존 QR 변경 안내를 확인하고 `replaceExisting:true`로 요청한 경우에만 복원 불가능한 기존 키를 교체한다. 다른 학생의 복원 가능한 키는 유지한다. 학생 누락·암호문 손상·해시 불일치는 전체 트랜잭션을 중단하며 부분 발급하지 않는다. CSRF·교사 권한·기존 요청 제한·응답 no-store를 유지한다.

인쇄 키는 열린 인쇄 화면의 메모리에만 두고 브라우저 보관함에 저장하지 않는다. 계정을 바꾸거나 화면을 닫으면 준비 요청을 취소하고 키 화면을 닫는다. 배치 변경·재인쇄는 추가 발급 요청을 하지 않는다.

A4 세로, 사방10mm 여백, 인쇄 영역190×277mm를 사용한다. 기본은 가로3열·세로4행이며 가로는 1–5열, 세로는 1–6행으로 바꿀 수 있다. 정사각 배치도 지원한다. 30명 기준3×4는3쪽(12·12·6명),3×3은4쪽, 4×6은 2쪽(24·6명), 5×5는2쪽이다. QR 주변4모듈의 흰 여백, 최대40자 이름+번호, 행·열 간격과 페이지 제목·쪽 번호를 포함해 QR 크기를 계산한다. 실제 인코딩된 URL의 모듈 크기가0.5mm보다 작아지는 배치는 인쇄를 막고2열×3행 확대를 제공한다. 브라우저 인쇄에서도 해당 QR 쪽을 숨기고 배치 확인 안내만 출력한다.0.5mm는 프로젝트의 보수적인 출력 기준이며 실물 프린터·카메라 품질을 보장하는 인증은 아니다.

압축은 QR에 담을 정보를 줄이는 방향으로 적용한다. 학생·학급 정보는 서버에서 조회하고 QR에는 짧은 접속 주소와 무작위 키만 담는다. 새 키는 기존보다16자, 파라미터 이름은10자가 줄어 같은 출처에서 총26자가 줄어든다. 기존 QR을 간소화를 위해 자동 폐기하지 않는다. [OWASP의 무작위 식별자 지침](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)과 [DENSO의 QR 인쇄 여백·크기 기준](https://www.qrcode.com/en/howto/code.html/index.html)을 참고했다.

검증과 검증용 PDF는 [QR 인쇄 기록](evidence/student-qr-print-2026-11-12/checkpoint.json)을 따른다. 실제 학생 데이터·물리 인쇄/카메라·운영 배포는 별도다.

## 학급 미션 — 2026-11-12

미션은 학생이 읽거나 활동지를 내면 교사가 확인해 통과시키는 학급 활동이다. 과제(작품 제출)와 별개이며, 미션 기록은 서비스 자료일 뿐 작성 원고(StoryDocument)를 읽거나 바꾸지 않는다.

- **종류**: `reading`(읽기, 읽을 작품 필수) · `worksheet`(독후 활동지, 질문 1개 이상) · `custom`(자유 — 교실 활동·종이 활동지). 읽을 작품은 제공 네 작품(`rabbit`·`onggojib`·`seonnyeo`·`heungbu`) 가운데 하나이고 판본은 `original`·`knolstory`·`shortstory`다.
- **만들기**: 교사는 `놀스토리 제공 미션 가져오기` 또는 `직접 만들기`로 시작한다. 제공 미션(`apps/web/lib/provided-missions.ts`, 작품마다 읽기·독후 활동지·교실 활동)은 사본으로 가져와 제목·안내·통과 기준·질문을 고친 뒤 배정한다. 배정한 뒤에는 질문을 바꾸지 않고 열림/마감만 바꾼다.
- **한도**: 제목 80자, 안내·통과 기준·답변·남길 말·피드백 각 2,000자, 질문 최대 8개(각 400자, id `q1`–`q8`).
- **학생 흐름**: ‘내 과제’의 ‘나의 미션’에서 `읽으러 가기`로 지정 판본을 열고, 답변이나 읽고 남길 말을 적어 `확인 요청`한다. 상태는 `아직 안 했어요 → 확인 대기 → (다시 쓰기 ↔ 확인 대기) → 미션 성공`이다. 다시 요청하면 확인 대기로 돌아가고 이전 피드백은 ‘지난 피드백’으로 남는다. 쓰던 글은 계정·미션별로 이 기기에 임시 보관한다.
- **교사 확인**: 미션마다 `학생 확인하기`로 학급 전체의 상태와 답변을 보고 `통과`·`다시 쓰기`(남길 말 필수)·`확인 상태 지우기`를 고른다. 온라인 답변이 없는 학생도 `직접 확인하고 통과`로 통과시킬 수 있다(종이 활동지·교실 활동).
- **최신 답변 보호**: 확인 요청에는 교사가 읽은 제출 시각(`expectedSubmittedAt`, 미제출은 `null`)을 함께 보낸다. 그 사이 학생이 다시 냈으면 `409 MISSION_SUBMISSION_CHANGED`로 거절하고 웹은 새 답변을 불러와 다시 확인하게 한다. 같은 밀리초의 재제출도 제출 시각이 1 커진다.
- **읽기 주소**: 원작·놀스토리는 `/?view=library&readWork={storyKey}&readEdition={original|knolstory}`로 서재와 같은 방식으로 책 표지를 열고 `미션으로 돌아가기`를 보여 준다. 숏스토리는 `/shortstory?work={storyKey}&mode=read&from=mission`이다. 읽기 진입은 원고를 만들거나 바꾸지 않는다.

### 미션 API (`/api/v1/class/classroom/missions`)

| 메서드·경로 | 권한 | 요청 | 응답 `data` |
|---|---|---|---|
| GET `` | teacher·student | — | `Mission[]` (학생은 자기 `progress` 포함) |
| POST `` | teacher | `MissionInput` | `Mission` (201) |
| PATCH `/{id}` | teacher | `{open}` | `Mission` |
| PUT `/{id}/submission` | student(열린 미션) | `{answers:{q1:…},note}` | `{submittedAt}` |
| GET `/{id}/progress` | teacher | — | 학급 모든 학생의 `MissionStudentProgress[]` |
| PUT `/{id}/progress/{number}` | teacher | `{reviewStatus:'passed'\|'revise'\|null,feedback,expectedSubmittedAt}` | `MissionStudentProgress` |

```ts
type MissionInput = {title:string; description:string; criteria:string; kind:'reading'|'worksheet'|'custom'; storyKey:string|null; readingFormat:'original'|'knolstory'|'shortstory'; questions:{id:string;prompt:string}[]};
type MissionProgress = {answers:Record<string,string>; note:string; submittedAt:number|null; reviewStatus:'passed'|'revise'|null; feedback:string; reviewedAt:number|null};
type Mission = MissionInput & {id:string; open:boolean; createdAt:number; progress?:MissionProgress};
type MissionStudentProgress = MissionProgress & {number:number; name:string};
```

- 미션 만들기와 제출은 요청 본문 한도 64KiB를 쓴다(한글 2,000자 답변 8개와 남길 말이 약 54KiB). 열림/마감과 확인은 일반 한도 16KiB다.
- 오류 코드: `MISSION_NOT_FOUND`, `MISSION_CLOSED`, `MISSION_SUBMISSION_CHANGED`, `MISSION_UNAVAILABLE`와 기존 `ROLE_NOT_ALLOWED`·`CLASSROOM_NOT_FOUND`·`STUDENT_NOT_FOUND`·`INVALID_REQUEST`·`REQUEST_TOO_LARGE`. 다른 학급의 미션은 `MISSION_NOT_FOUND`로 답한다.
- 데이터베이스(migration `011-classroom-missions.sql`): `missions(id, classroom_id, title, description, criteria, kind, story_key, reading_format, questions jsonb, open, created_at)`, `mission_progress(mission_id, student_account_id, answers jsonb, note, submitted_at, review_status, feedback, reviewed_at, PK(mission_id, student_account_id))`. 학급·학생을 지우면 함께 지워진다.
