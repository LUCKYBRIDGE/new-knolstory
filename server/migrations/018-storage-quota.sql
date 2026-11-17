-- Online storage limits (2026-11-18): each saved work and submission records its upload size,
-- so account and classroom usage is a cheap sum. Existing rows take their current JSON size.
ALTER TABLE knolstory_storage.private_documents
 ADD COLUMN byte_length bigint NOT NULL DEFAULT 0 CHECK(byte_length BETWEEN 0 AND 9007199254740991);
UPDATE knolstory_storage.private_documents d SET byte_length=octet_length(r.projection::text)
 FROM knolstory_storage.records r WHERE r.scope_id=d.scope_id AND r.record_id=d.record_id;
ALTER TABLE knolstory_class.submissions
 ADD COLUMN byte_length bigint NOT NULL DEFAULT 0 CHECK(byte_length BETWEEN 0 AND 9007199254740991);
UPDATE knolstory_class.submissions SET byte_length=octet_length(document::text);
