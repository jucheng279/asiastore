/*
  # Create user_favorites table

  1. New Tables
    - `user_favorites`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, FK to profiles.id)
      - `product_id` (text, stores the UUID string of the favorited product)
      - `created_at` (timestamptz, default now())
  2. Constraints
    - Unique constraint on (user_id, product_id) to prevent duplicate favorites
  3. Security
    - Enable RLS on `user_favorites` table
    - Authenticated users can SELECT their own favorites
    - Authenticated users can INSERT their own favorites
    - Authenticated users can DELETE their own favorites
*/

CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
