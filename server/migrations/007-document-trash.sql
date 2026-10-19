ALTER TABLE knolstory_storage.private_documents
 ADD COLUMN deleted_at bigint CHECK(deleted_at BETWEEN 0 AND 9007199254740991),
 ADD COLUMN state_version bigint NOT NULL DEFAULT 1 CHECK(state_version BETWEEN 1 AND 9007199254740991);
CREATE TABLE knolstory_storage.document_state_commands (
 scope_id text NOT NULL,
 record_id text NOT NULL,
 idempotency_key text COLLATE "C" NOT NULL CHECK(idempotency_key ~ '^[A-Za-z0-9_-]{1,128}$'),
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{64}$'),
 receipt jsonb NOT NULL CHECK(jsonb_typeof(receipt)='object'),
 PRIMARY KEY(scope_id,record_id,idempotency_key),
 FOREIGN KEY(scope_id,record_id) REFERENCES knolstory_storage.private_documents(scope_id,record_id)
);
CREATE INDEX private_documents_trash_owner_idx ON knolstory_storage.private_documents(owner_account_id,deleted_at,updated_at DESC,record_id DESC);
