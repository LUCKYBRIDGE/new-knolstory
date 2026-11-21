-- Task-level writing rules (2026-11-21).
-- edit_scope: which editing tools a writing task allows (text is always allowed). NULL follows the
-- classroom/student setting. after_assignment_id: a KnolStory task that opens only after the student's
-- work in an earlier ShortStory task was passed by the teacher.
ALTER TABLE knolstory_class.assignments
 ADD COLUMN edit_scope jsonb CHECK(edit_scope IS NULL OR jsonb_typeof(edit_scope)='object'),
 ADD COLUMN after_assignment_id uuid REFERENCES knolstory_class.assignments(id) ON DELETE SET NULL
  CHECK(after_assignment_id IS NULL OR after_assignment_id<>id);
CREATE INDEX assignments_after_idx ON knolstory_class.assignments(after_assignment_id) WHERE after_assignment_id IS NOT NULL;
