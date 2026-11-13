-- Optional due date for assignments and missions (end of the chosen day, as epoch milliseconds).
ALTER TABLE knolstory_class.assignments ADD COLUMN due_at bigint CHECK(due_at IS NULL OR due_at BETWEEN 0 AND 9007199254740991);
ALTER TABLE knolstory_class.missions ADD COLUMN due_at bigint CHECK(due_at IS NULL OR due_at BETWEEN 0 AND 9007199254740991);
