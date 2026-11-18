-- Writing tasks that read like tasks (2026-11-18): a checklist of what good work shows, an optional
-- amount (cuts or pages), and mid-way drafts the student chooses to show the teacher, with a short
-- teacher note. Drafts use the student's submission space.
ALTER TABLE knolstory_class.assignments
 ADD COLUMN checks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(checks)='array' AND jsonb_array_length(checks)<=5),
 ADD COLUMN target_amount integer CHECK(target_amount IS NULL OR target_amount BETWEEN 1 AND 500);
ALTER TABLE knolstory_class.submissions
 ADD COLUMN amount integer NOT NULL DEFAULT 0 CHECK(amount>=0),
 ADD COLUMN chars integer NOT NULL DEFAULT 0 CHECK(chars>=0);
CREATE TABLE knolstory_class.submission_drafts (
 assignment_id uuid NOT NULL REFERENCES knolstory_class.assignments(id) ON DELETE CASCADE,
 student_account_id uuid NOT NULL REFERENCES knolstory_class.students(account_id) ON DELETE CASCADE,
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 byte_length bigint NOT NULL DEFAULT 0 CHECK(byte_length BETWEEN 0 AND 9007199254740991),
 amount integer NOT NULL DEFAULT 0 CHECK(amount>=0),
 chars integer NOT NULL DEFAULT 0 CHECK(chars>=0),
 saved_at bigint NOT NULL CHECK(saved_at>=0),
 comment text NOT NULL DEFAULT '' CHECK(char_length(comment)<=300),
 commented_at bigint CHECK(commented_at IS NULL OR commented_at>=0),
 PRIMARY KEY(assignment_id,student_account_id)
);
CREATE INDEX submission_drafts_student_idx ON knolstory_class.submission_drafts(student_account_id);
