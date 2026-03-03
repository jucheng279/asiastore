/*
  # Create user profiles and delivery addresses tables

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique, not null)
      - `nickname` (text, nullable)
      - `email` (text, not null)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    - `user_addresses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id on delete cascade)
      - `label` (text - Apartment, House, Office, Hotel, Other)
      - `full_name` (text)
      - `phone` (text)
      - `email` (text, nullable)
      - `street_address` (text)
      - `city` (text, default 'Linkoping')
      - `postal_code` (text)
      - `country` (text, default 'Sweden')
      - `is_default` (boolean, default false)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Authenticated users can read/update their own profile
    - Authenticated users can CRUD their own addresses
    - All authenticated users can read all profiles and addresses (for inventory admin panel)

  3. Triggers
    - Auto-create profile row when a new user signs up via auth.users
    - Auto-update updated_at on profiles when row changes
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  nickname text,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles (needed for admin inventory panel)
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Profiles: users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profiles: users can insert their own profile row
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Profiles: users can delete only their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Apartment',
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text,
  street_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Linkoping',
  postal_code text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Sweden',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Addresses: authenticated users can read all addresses (needed for admin inventory panel)
CREATE POLICY "Authenticated users can read all addresses"
  ON user_addresses
  FOR SELECT
  TO authenticated
  USING (true);

-- Addresses: users can insert their own addresses
CREATE POLICY "Users can insert own addresses"
  ON user_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Addresses: users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON user_addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Addresses: users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON user_addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'nickname',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Trigger: auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_updated'
  ) THEN
    CREATE TRIGGER on_profile_updated
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Anon select policies for inventory admin panel (uses anon key)
CREATE POLICY "Anon can read all profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read all addresses"
  ON user_addresses
  FOR SELECT
  TO anon
  USING (true);
