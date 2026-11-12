-- Login hashes remain the lookup key. Authenticated encryption allows teachers
-- to reprint existing cards without invalidating already distributed QR codes.
-- Existing hash-only cards stay valid until an explicitly confirmed reissue.
ALTER TABLE knolstory_class.students ADD COLUMN qr_token_cipher text;
