-- Every 읽기·활동 과제 (독후 활동지) submission and every teacher decision stays as an online record (2026-11-26).
-- mission_progress keeps only the latest state; this table keeps what was handed in and what was sent back, in order,
-- so a teacher and the student can look back after a rewrite. Rows go with the mission or the student.
CREATE TABLE knolstory_class.mission_history (
 id uuid PRIMARY KEY,
 -- Written order: two records in the same millisecond (a submit and an immediate decision) still read in order.
 seq bigint GENERATED ALWAYS AS IDENTITY,
 mission_id uuid NOT NULL REFERENCES knolstory_class.missions(id) ON DELETE CASCADE,
 student_account_id uuid NOT NULL REFERENCES knolstory_class.students(account_id) ON DELETE CASCADE,
 event text NOT NULL CHECK(event IN ('submitted','passed','revise','cleared')),
 answers jsonb CHECK((event='submitted')=(answers IS NOT NULL) AND (answers IS NULL OR jsonb_typeof(answers)='object')),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=2000),
 feedback text NOT NULL DEFAULT '' CHECK(length(feedback)<=2000),
 at bigint NOT NULL CHECK(at BETWEEN 0 AND 9007199254740991)
);
CREATE INDEX mission_history_student_idx ON knolstory_class.mission_history(mission_id,student_account_id,seq);
