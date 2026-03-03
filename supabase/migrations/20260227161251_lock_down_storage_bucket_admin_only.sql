/*
  # Lock down category-images storage bucket

  1. Policy Changes
    - DROP anonymous INSERT policy on storage.objects for category-images
    - DROP anonymous UPDATE policy on storage.objects for category-images
    - DROP anonymous DELETE policy on storage.objects for category-images
    - ADD admin-only INSERT policy for authenticated users
    - ADD admin-only UPDATE policy for authenticated users
    - ADD admin-only DELETE policy for authenticated users
    - KEEP anonymous SELECT policy (public read for customer app image display)

  2. Security
    - Only authenticated admin users can upload, modify, or delete category images
    - Anyone can still view/download images (needed for customer app)
*/

DROP POLICY IF EXISTS "Allow anonymous uploads to category-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous updates to category-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous deletes from category-images" ON storage.objects;

CREATE POLICY "Admins can upload to category-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'category-images' AND is_admin());

CREATE POLICY "Admins can update category-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'category-images' AND is_admin())
  WITH CHECK (bucket_id = 'category-images' AND is_admin());

CREATE POLICY "Admins can delete from category-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'category-images' AND is_admin());
