
DROP POLICY IF EXISTS "sounds_public_read" ON storage.objects;
CREATE POLICY "sounds_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sounds');
