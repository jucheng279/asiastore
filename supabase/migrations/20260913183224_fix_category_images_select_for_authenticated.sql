-- The existing SELECT policy on category-images only covers anon.
-- Authenticated users (admins) need SELECT too, otherwise upsert uploads fail.
CREATE POLICY "Authenticated can view category-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'category-images');
