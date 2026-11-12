-- Untyped assignments previously accepted both document formats. Infer only an
-- unambiguous kind; mixed/unknown documents require an explicit preserving split.
DO $$
DECLARE review_ids text;
BEGIN
 SELECT string_agg(assignment_id::text, ', ' ORDER BY assignment_id::text)
 INTO review_ids
 FROM (
  SELECT assignment_id
  FROM knolstory_class.submissions
  GROUP BY assignment_id
  HAVING count(DISTINCT document #>> '{content,format}') <> 1
   OR bool_or(coalesce((document #>> '{content,format}') NOT IN ('knolstory','shortstory'), true))
 ) AS needs_review;
 IF review_ids IS NOT NULL THEN
  RAISE EXCEPTION 'Assignment format migration needs review: %', review_ids
   USING HINT = 'Review these assignments and preserve all submissions. Split mixed kinds into separate assignments; repair unknown document kinds before retrying migration.';
 END IF;
END $$;

ALTER TABLE knolstory_class.assignments
 ADD COLUMN format text NOT NULL DEFAULT 'knolstory'
 CONSTRAINT assignments_format_check CHECK (format IN ('knolstory','shortstory'));

UPDATE knolstory_class.assignments AS assignment
 SET format = 'shortstory'
 WHERE EXISTS (
  SELECT 1 FROM knolstory_class.submissions AS submission
  WHERE submission.assignment_id = assignment.id
   AND submission.document #>> '{content,format}' = 'shortstory'
 );
