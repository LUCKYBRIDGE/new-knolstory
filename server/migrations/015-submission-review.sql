-- The teacher reads a submitted work and marks it passed, or asks for a rewrite with feedback.
-- A new submission clears the decision; the last feedback stays visible.
ALTER TABLE knolstory_class.submissions
 ADD COLUMN review_status text CHECK(review_status IS NULL OR review_status IN ('passed','revise')),
 ADD COLUMN feedback text NOT NULL DEFAULT '' CHECK(length(feedback)<=2000),
 ADD COLUMN reviewed_at bigint CHECK(reviewed_at IS NULL OR reviewed_at BETWEEN 0 AND 9007199254740991);
