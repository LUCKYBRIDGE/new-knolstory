CREATE TABLE knolstory_auth.sessions (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 account_id uuid NOT NULL REFERENCES knolstory_auth.accounts(id),
 expires_at bigint NOT NULL CHECK(expires_at >= 0),
 revoked boolean NOT NULL DEFAULT false
);
CREATE INDEX sessions_account_id_idx ON knolstory_auth.sessions(account_id);
CREATE TABLE knolstory_auth.flows (
 state_hash text PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
 provider text NOT NULL CHECK(provider IN ('kakao','google')),
 purpose text NOT NULL CHECK(purpose IN ('login','link')),
 browser_binding_hash text NOT NULL CHECK(browser_binding_hash ~ '^[a-f0-9]{64}$'),
 start_session_hash text REFERENCES knolstory_auth.sessions(token_hash),
 verifier text NOT NULL CHECK(verifier ~ '^[A-Za-z0-9._~-]{43,128}$'),
 nonce text NOT NULL CHECK(nonce ~ '^[A-Za-z0-9_-]{43}$'),
 expires_at bigint NOT NULL CHECK(expires_at >= 0),
 CHECK(purpose <> 'link' OR (provider='google' AND start_session_hash IS NOT NULL))
);
