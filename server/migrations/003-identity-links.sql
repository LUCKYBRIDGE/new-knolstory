CREATE SCHEMA IF NOT EXISTS knolstory_auth;
CREATE TABLE knolstory_auth.accounts (
 id uuid PRIMARY KEY,
 status text NOT NULL CHECK(status IN ('active','inactive','deleted'))
);
CREATE TABLE knolstory_auth.identities (
 provider text NOT NULL CHECK(provider IN ('kakao','google')),
 subject text COLLATE "C" NOT NULL CHECK(length(btrim(subject))>0),
 account_id uuid NOT NULL REFERENCES knolstory_auth.accounts(id),
 CONSTRAINT identities_provider_subject_key PRIMARY KEY(provider,subject)
);
CREATE INDEX identities_account_id_idx ON knolstory_auth.identities(account_id);
