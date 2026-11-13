-- A teacher may attach one share link (e.g. a Google Drive folder) where students hand in work themselves.
-- Only the link is stored; no Google account, token or file passes through this service.
ALTER TABLE knolstory_class.assignments
 ADD COLUMN share_url text CHECK(share_url IS NULL OR (length(share_url) BETWEEN 9 AND 2048 AND share_url LIKE 'https://%'));
