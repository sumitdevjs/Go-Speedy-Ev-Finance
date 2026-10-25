-- Read-only deployment verification. Expect both buckets to exist and public=false.
SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('documents','ev-documents');
-- Inspect any remaining client/public policies for access to these buckets.
SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
