CREATE TABLE knolstory_storage.private_documents (
 scope_id text NOT NULL,
 record_id text NOT NULL,
 owner_account_id uuid NOT NULL REFERENCES knolstory_auth.accounts(id),
 created_at bigint NOT NULL CHECK(created_at BETWEEN 0 AND 9007199254740991),
 updated_at bigint NOT NULL CHECK(updated_at BETWEEN created_at AND 9007199254740991),
 PRIMARY KEY(scope_id,record_id),
 FOREIGN KEY(scope_id,record_id) REFERENCES knolstory_storage.records(scope_id,record_id),
 CHECK(scope_id='account:'||owner_account_id::text),
 CHECK(record_id ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
);
CREATE INDEX private_documents_owner_updated_idx ON knolstory_storage.private_documents(owner_account_id,updated_at DESC,record_id DESC);
CREATE TABLE knolstory_storage.document_creations (
 owner_account_id uuid NOT NULL REFERENCES knolstory_auth.accounts(id),
 idempotency_key text COLLATE "C" NOT NULL CHECK(idempotency_key ~ '^[A-Za-z0-9_-]{1,128}$'),
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{64}$'),
 scope_id text NOT NULL,
 record_id text NOT NULL,
 content_sha256 text NOT NULL CHECK(content_sha256 ~ '^[a-f0-9]{64}$'),
 created_at bigint NOT NULL CHECK(created_at BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY(owner_account_id,idempotency_key),
 FOREIGN KEY(scope_id,record_id) REFERENCES knolstory_storage.private_documents(scope_id,record_id),
 CHECK(scope_id='account:'||owner_account_id::text)
);
