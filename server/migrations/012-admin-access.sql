-- Admin access view keeps only the latest sign-in per account: one overwritten value, no growing log.
-- No IP, device or token is stored.
ALTER TABLE knolstory_auth.accounts
 ADD COLUMN last_login_at bigint CHECK(last_login_at IS NULL OR last_login_at BETWEEN 0 AND 9007199254740991),
 ADD COLUMN last_login_method text CHECK(last_login_method IS NULL OR last_login_method IN ('kakao','google','password','qr'));

-- The admin can always read the one shared teacher code (encrypted with the classroom secret) and pause it.
-- A code saved before this migration has no cipher; the admin sees it as unknown until it is saved again.
ALTER TABLE knolstory_class.teacher_codes
 ADD COLUMN code_cipher text CHECK(code_cipher IS NULL OR length(code_cipher) BETWEEN 1 AND 1024),
 ADD COLUMN paused boolean NOT NULL DEFAULT false;
