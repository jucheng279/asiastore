/*
  # Create product-images storage bucket

  1. Storage
    - Create a public bucket `product-images` for storing product photos
    - Public read access so customer app can display images via direct URL
    - Admin-only write access (INSERT, UPDATE, DELETE) using is_admin() helper

  2. Security
    - Anyone (anon + authenticated) can view/download images
    - Only authenticated admin users can upload, modify, or delete product images
    - Follows same security pattern as the existing category-images bucket
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Anyone can view product-images" ON storage.objects;
CREATE POLICY "Anyone can view product-images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Admin-only write
DROP POLICY IF EXISTS "Admins can upload to product-images" ON storage.objects;
CREATE POLICY "Admins can upload to product-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "Admins can update product-images" ON storage.objects;
CREATE POLICY "Admins can update product-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND is_admin())
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "Admins can delete from product-images" ON storage.objects;
CREATE POLICY "Admins can delete from product-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND is_admin());
