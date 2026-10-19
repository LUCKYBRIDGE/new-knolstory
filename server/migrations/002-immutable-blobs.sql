CREATE FUNCTION knolstory_storage.reject_blob_change() RETURNS trigger
 LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Stored audio blobs are immutable'; END; $$;
CREATE TRIGGER immutable_blob BEFORE UPDATE OR DELETE ON knolstory_storage.blobs
 FOR EACH ROW EXECUTE FUNCTION knolstory_storage.reject_blob_change();
