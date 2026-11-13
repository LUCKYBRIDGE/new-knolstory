-- Optional due date for assignments and missions (end of the chosen day, as epoch milliseconds).
ALTER TABLE knolstory_class.assignments ADD COLUMN due_at bigint CHECK(due_at IS NULL OR due_at BETWEEN 0 AND 9007199254740991);
ALTER TABLE knolstory_class.missions ADD COLUMN due_at bigint CHECK(due_at IS NULL OR due_at BETWEEN 0 AND 9007199254740991);
-- Built-in works have two KnolStory editions: the original (원작) and the adaptation (각색). NULL keeps older tasks on the adaptation.
ALTER TABLE knolstory_class.assignments ADD COLUMN edition text CHECK(edition IS NULL OR edition IN ('original','knolstory'));
