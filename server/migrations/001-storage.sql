CREATE TABLE IF NOT EXISTS knolstory_storage.records (
 scope_id text NOT NULL CHECK(length(btrim(scope_id))>0),
 record_id text NOT NULL CHECK(length(btrim(record_id))>0),
 client_project_id text NOT NULL CHECK(length(btrim(client_project_id))>0),
 format text NOT NULL CHECK(format IN ('knolstory','shortstory')),
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 projection jsonb NOT NULL CHECK(jsonb_typeof(projection)='object' AND projection->>'projectionVersion'='1'),
 PRIMARY KEY(scope_id,record_id)
);
CREATE TABLE IF NOT EXISTS knolstory_storage.blobs (
 id text PRIMARY KEY,
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 mime text NOT NULL CHECK(mime IN ('audio/wav','audio/ogg','audio/mpeg')),
 byte_length integer NOT NULL CHECK(byte_length BETWEEN 1 AND 5242880),
 bytes bytea NOT NULL CHECK(octet_length(bytes)=byte_length)
);
CREATE TABLE IF NOT EXISTS knolstory_storage.receipts (
 scope_id text NOT NULL,
 record_id text NOT NULL,
 idempotency_key text NOT NULL CHECK(length(btrim(idempotency_key))>0),
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{64}$'),
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 content_sha256 text NOT NULL CHECK(content_sha256 ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(scope_id,record_id,idempotency_key),
 FOREIGN KEY(scope_id,record_id) REFERENCES knolstory_storage.records(scope_id,record_id)
);
