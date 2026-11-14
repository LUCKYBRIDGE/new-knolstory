-- Where a writing task on a built-in work starts: a chapter (original) or a choice point (adaptation).
-- The label is stored so lists never need the manuscript; NULL means the whole work.
ALTER TABLE knolstory_class.assignments
 ADD COLUMN start_point text CHECK(start_point IS NULL OR start_point ~ '^(chapter|choice):[A-Za-z0-9_.:-]{1,200}$'),
 ADD COLUMN start_label text CHECK(start_label IS NULL OR length(start_label) BETWEEN 1 AND 120);
