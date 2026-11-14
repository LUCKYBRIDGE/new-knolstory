-- Who a task is for. NULL means the whole class; otherwise the listed student accounts only.
-- A deleted student's id simply stops matching; an empty array means no one is left.
ALTER TABLE knolstory_class.assignments
 ADD COLUMN recipient_ids uuid[] CHECK(recipient_ids IS NULL OR cardinality(recipient_ids)<=30);
ALTER TABLE knolstory_class.missions
 ADD COLUMN recipient_ids uuid[] CHECK(recipient_ids IS NULL OR cardinality(recipient_ids)<=30);
