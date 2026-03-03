/*
  # Create category-images storage bucket

  1. Storage
    - Create a public bucket `category-images` for storing category images
  2. Security
    - Allow anonymous users to upload images (INSERT)
    - Allow anonymous users to read images (SELECT)
    - Allow anonymous users to delete images (DELETE)
    - Allow anonymous users to update/replace images (UPDATE)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anonymous uploads to category-images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Allow anonymous reads from category-images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'category-images');

CREATE POLICY "Allow anonymous deletes from category-images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'category-images');

CREATE POLICY "Allow anonymous updates to category-images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'category-images')
  WITH CHECK (bucket_id = 'category-images');
