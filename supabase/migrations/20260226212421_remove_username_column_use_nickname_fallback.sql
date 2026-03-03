/*
  # Remove username column, use nickname with email-prefix fallback

  1. Data Migration
    - Backfill nickname from username for any rows where nickname is NULL
  2. Schema Changes
    - Drop unique constraint on username
    - Drop username column from profiles
  3. Trigger Update
    - Replace handle_new_user() so nickname gets COALESCE(nickname_meta, email_prefix)
    - username is no longer referenced
*/

UPDATE public.profiles
SET nickname = username
WHERE nickname IS NULL AND username IS NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;
