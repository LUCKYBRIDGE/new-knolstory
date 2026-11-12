CREATE TABLE knolstory_class.missions (
 id uuid PRIMARY KEY,
 classroom_id uuid NOT NULL REFERENCES knolstory_class.classrooms(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 80),
 description text NOT NULL CHECK(length(description)<=2000),
 criteria text NOT NULL CHECK(length(criteria)<=2000),
 kind text NOT NULL CHECK(kind IN ('reading','worksheet','custom')),
 story_key text CHECK(story_key IS NULL OR story_key IN ('rabbit','onggojib','seonnyeo','heungbu')),
 reading_format text NOT NULL CHECK(reading_format IN ('original','knolstory','shortstory')),
 questions jsonb NOT NULL CHECK(jsonb_typeof(questions)='array' AND jsonb_array_length(questions)<=8),
 open boolean NOT NULL DEFAULT true,
 created_at bigint NOT NULL CHECK(created_at BETWEEN 0 AND 9007199254740991)
);
CREATE INDEX missions_classroom_idx ON knolstory_class.missions(classroom_id,created_at DESC,id);
CREATE TABLE knolstory_class.mission_progress (
 mission_id uuid NOT NULL REFERENCES knolstory_class.missions(id) ON DELETE CASCADE,
 student_account_id uuid NOT NULL REFERENCES knolstory_class.students(account_id) ON DELETE CASCADE,
 answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(answers)='object'),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=2000),
 submitted_at bigint CHECK(submitted_at BETWEEN 0 AND 9007199254740991),
 review_status text CHECK(review_status IN ('passed','revise')),
 feedback text NOT NULL DEFAULT '' CHECK(length(feedback)<=2000),
 reviewed_at bigint CHECK(reviewed_at BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY(mission_id,student_account_id)
);
CREATE INDEX mission_progress_student_idx ON knolstory_class.mission_progress(student_account_id);
