/*
  # Lock down profiles table RLS policies

  1. Policy Changes
    - DROP "Anon can read all profiles" - anonymous users should not browse all profiles
    - DROP "Authenticated users can read all profiles" - regular users should only read own profile
    - DROP "Users can update own profile" - replace with version that prevents is_admin self-promotion
    - ADD "Users can read own profile" - authenticated users read only their own row
    - ADD "Admins can read all profiles" - admin users can read all profiles (Users panel)
    - ADD "Users can update own profile except admin flag" - users can update own row but not is_admin
    - ADD "Admins can update any profile" - admins can update any profile including is_admin
    - ADD "Admins can delete any profile" - admins can delete users from Users panel

  2. Security
    - Prevents non-admin users from setting is_admin = true on themselves
    - Anonymous users can no longer browse profile data
    - Regular users can only see their own profile
    - Admin users have full read/write access to all profiles
*/

DROP POLICY IF EXISTS "Anon can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can update own profile except admin flag"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());
