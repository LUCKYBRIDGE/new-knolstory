# 학급·교사·학생 계정 설계 — 2026-11-10 사용자 결정

이 문서는 학급 기능의 정식 계약이다. 서버(`server/`)와 웹(`apps/web/`)은 아래 API·데이터 규칙을 그대로 따른다. 이전의 미결 질문 Q-01(교사/학급 승인)·Q-02(공유 범위)는 이 결정으로 대체한다. 보관 기간(Q-03)은 계속 미결이다.

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
- **QR 즉시 접속**: 교사가 학생별 QR을 만들면 서버가 1회성이 아닌 **재발급 가능한 접속 토큰**(32바이트 무작위, 해시만 저장)을 만든다. QR 내용은 `{origin}/?class-login={token}`. 교사가 재발급하면 이전 QR은 무효.
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

- 교사는 과제를 만든다(제목, 설명, 선택: 바탕 작품 키). 과제는 `열림/닫힘` 상태를 가진다.
- 학생은 **열린 과제마다 제출란 하나**에 자기 작품 하나를 온라인 저장(제출·다시 제출)할 수 있다. 닫힌 과제는 읽기만 된다.
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
| POST `/student-login` | 손님 | `{classCode, number, password}` | `{role:'student'}` + 세션 쿠키 |
| POST `/qr-login` | 손님 | `{token}` | `{role:'student'}` + 세션 쿠키 |
| GET `/classroom/assignments` | teacher·student | — | `Assignment[]` (학생은 자기 제출 상태 포함) |
| POST `/classroom/assignments` | teacher | `{title, description?, storyKey?}` | `Assignment` |
| PATCH `/classroom/assignments/{id}` | teacher | `{title?, description?, open?}` | `Assignment` |
| GET `/classroom/assignments/{id}/submissions` | teacher | — | `{number,name,submittedAt}[]` |
| GET `/classroom/assignments/{id}/submissions/{number}` | teacher | — | `{document, submittedAt}` |
| PUT `/classroom/assignments/{id}/submission` | student(열린 과제) | `{document}` | `{submittedAt}` |
| GET `/classroom/assignments/{id}/submission` | student | — | `{document, submittedAt}` 또는 404 |

```ts
type ClassroomSummary = {id:string; name:string; classCode:string; studentCount:number};
type Student = {number:number; name:string; password:string; permissions:EditingPermissions|null; hasQr:boolean};
type Classroom = ClassroomSummary & {defaultPermissions:EditingPermissions; students:Student[]};
type Assignment = {id:string; title:string; description:string; storyKey:string|null; open:boolean; createdAt:number; submittedAt?:number|null};
```

- 학생은 개인 작품 API(`/api/v1/documents`)를 쓸 수 없다(403 `ROLE_NOT_ALLOWED`). 일반 계정도 쓸 수 없다. 교사·관리자만 쓸 수 있다.
- 오류 코드: `ROLE_NOT_ALLOWED`, `CLASSROOM_EXISTS`, `CLASSROOM_NOT_FOUND`, `STUDENT_LIMIT`, `STUDENT_NOT_FOUND`, `INVALID_LOGIN`, `INVALID_TEACHER_CODE`, `ASSIGNMENT_CLOSED`, `ASSIGNMENT_NOT_FOUND`, `INVALID_DOCUMENT`, `INVALID_REQUEST`.

## 7. 데이터베이스 (migration `008-classroom.sql`, 스키마 `knolstory_class`)

- `knolstory_auth.accounts`에 `role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','teacher','student'))` 추가. 관리자는 설정으로 판정한다.
- `teacher_codes(id smallint PK CHECK(id=1), code_hash, updated_at)`
- `classrooms(id uuid PK, teacher_account_id uuid UNIQUE, name, class_code UNIQUE, default_permissions jsonb, created_at)`
- `students(account_id uuid PK → accounts, classroom_id, number 1–30, name, password_hash, password_cipher, permissions jsonb NULL, qr_token_hash NULL UNIQUE, UNIQUE(classroom_id, number))`
- `assignments(id uuid PK, classroom_id, title, description, story_key NULL, open bool, created_at)`
- `submissions(assignment_id, student_account_id, document jsonb, submitted_at, PK(assignment_id, student_account_id))`

## 8. 웹 화면

- 서재 상단 계정 메뉴: 역할에 따라 `교사 등록`(일반), `교사 대시보드`(교사), `내 학급·과제`(학생), `관리자`(관리자) 입구를 둔다.
- 첫 화면의 계정 입구 옆에 `학생 로그인`(학급 코드·번호·비밀번호). `?class-login=` 주소로 들어오면 바로 QR 로그인을 시도한다.
- **교사 대시보드**(`/teacher`): 학급 만들기 → 학급 코드 보기·새로 만들기 → 학생 만들기(개수) → 학생 표(번호·이름·비밀번호 보기/바꾸기·QR·편집 허용) → 여러 학생 선택해 허용 범위 일괄 적용 → 학급 기본 허용 범위 → 과제(만들기·열기/닫기·제출 보기·제출 작품 열기).
- **학생 대시보드**(`/student`): 내 번호·이름, 열린 과제 목록, 과제마다 `이 기기의 작품 고르기 → 제출`과 제출 상태, 내 편집 허용 범위 안내.
- **관리자**(`/admin`): 교사 등록 코드 바꾸기.
- 대시보드는 휴대폰·태블릿·PC에서 쓸 수 있게 하고, 비밀번호는 기본으로 가려 두고 `보기`를 눌렀을 때만 보인다.
