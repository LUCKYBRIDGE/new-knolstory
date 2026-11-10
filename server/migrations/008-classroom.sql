CREATE SCHEMA IF NOT EXISTS knolstory_class;
ALTER TABLE knolstory_auth.accounts
 ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','teacher','student'));
CREATE TABLE knolstory_class.teacher_codes (
 id smallint PRIMARY KEY CHECK(id=1),
 code_hash text NOT NULL CHECK(length(code_hash) BETWEEN 1 AND 512),
 updated_at bigint NOT NULL CHECK(updated_at BETWEEN 0 AND 9007199254740991)
);
CREATE TABLE knolstory_class.classrooms (
 id uuid PRIMARY KEY,
 teacher_account_id uuid NOT NULL UNIQUE REFERENCES knolstory_auth.accounts(id),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 60),
 class_code text NOT NULL UNIQUE CHECK(class_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 default_permissions jsonb NOT NULL CHECK(jsonb_typeof(default_permissions)='object'),
 created_at bigint NOT NULL CHECK(created_at BETWEEN 0 AND 9007199254740991)
);
CREATE TABLE knolstory_class.students (
 account_id uuid PRIMARY KEY REFERENCES knolstory_auth.accounts(id),
 classroom_id uuid NOT NULL REFERENCES knolstory_class.classrooms(id) ON DELETE CASCADE,
 number smallint NOT NULL CHECK(number BETWEEN 1 AND 30),
 name text NOT NULL DEFAULT '' CHECK(length(name)<=40),
 password_hash text NOT NULL CHECK(length(password_hash) BETWEEN 1 AND 512),
 password_cipher text NOT NULL CHECK(length(password_cipher) BETWEEN 1 AND 512),
 permissions jsonb CHECK(permissions IS NULL OR jsonb_typeof(permissions)='object'),
 qr_token_hash text UNIQUE CHECK(qr_token_hash IS NULL OR qr_token_hash ~ '^[a-f0-9]{64}$'),
 UNIQUE(classroom_id,number)
);
CREATE TABLE knolstory_class.assignments (
 id uuid PRIMARY KEY,
 classroom_id uuid NOT NULL REFERENCES knolstory_class.classrooms(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 100),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 story_key text CHECK(story_key IS NULL OR length(story_key) BETWEEN 1 AND 128),
 open boolean NOT NULL DEFAULT true,
 created_at bigint NOT NULL CHECK(created_at BETWEEN 0 AND 9007199254740991)
);
CREATE INDEX assignments_classroom_idx ON knolstory_class.assignments(classroom_id,created_at DESC,id);
CREATE TABLE knolstory_class.submissions (
 assignment_id uuid NOT NULL REFERENCES knolstory_class.assignments(id) ON DELETE CASCADE,
 student_account_id uuid NOT NULL REFERENCES knolstory_class.students(account_id) ON DELETE CASCADE,
 document jsonb NOT NULL,
 submitted_at bigint NOT NULL CHECK(submitted_at BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY(assignment_id,student_account_id)
);
CREATE INDEX submissions_student_idx ON knolstory_class.submissions(student_account_id);
