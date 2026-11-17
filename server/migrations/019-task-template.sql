-- Teacher task templates (2026-11-18): a work the teacher attaches to a writing task. Students start
-- from a copy of it. It counts toward the classroom pool like any other online work.
ALTER TABLE knolstory_class.assignments
 ADD COLUMN template jsonb CHECK(template IS NULL OR jsonb_typeof(template)='object'),
 ADD COLUMN template_title text CHECK(template_title IS NULL OR char_length(template_title)<=400),
 ADD COLUMN template_byte_length bigint NOT NULL DEFAULT 0 CHECK(template_byte_length BETWEEN 0 AND 9007199254740991);
