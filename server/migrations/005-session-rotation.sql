ALTER TABLE knolstory_auth.sessions
 ADD COLUMN rotated_from text REFERENCES knolstory_auth.sessions(token_hash);
CREATE INDEX sessions_rotated_from_idx ON knolstory_auth.sessions(rotated_from);
