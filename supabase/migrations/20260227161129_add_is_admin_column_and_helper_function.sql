/*
  # Add admin role support

  1. Schema Changes
    - Add `is_admin` boolean column to `profiles` table (default false)
    - Set `chengju279@gmail.com` (id: d50c0d62-4e1f-47c3-ac39-acd64160ae10) as admin

  2. New Functions
    - `is_admin()` - returns true if the currently authenticated user has is_admin = true
      Used in RLS policies to gate admin-only operations

  3. Security
    - The is_admin column cannot be self-promoted: only existing admins can change it (enforced in later migration)
    - The is_admin() function is SECURITY DEFINER so it can read profiles regardless of RLS
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE profiles SET is_admin = true WHERE id = 'd50c0d62-4e1f-47c3-ac39-acd64160ae10';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;
