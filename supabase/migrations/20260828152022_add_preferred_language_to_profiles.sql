/*
# Add preferred_language column to profiles

1. Modified Tables
   - `profiles`
     - Added `preferred_language` (text, default 'en', not null)
       Stores the user's preferred UI language. Valid values: 'en', 'sv', 'zh'.

2. Notes
   - Uses a CHECK constraint to restrict to supported languages.
   - Defaults to 'en' for existing and new users who haven't set a preference.
   - No security changes needed — existing update policy already allows users to update their own profile row.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_language text NOT NULL DEFAULT 'en';
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_language_check
      CHECK (preferred_language IN ('en', 'sv', 'zh'));
  END IF;
END $$;
