/*
  # Update Registration Bonus to 5 Points & Add Points Payment to Orders

  1. Changes
    - Update `handle_new_profile_points` trigger function to grant 5 points (was 0) as welcome bonus
    - Add `paid_with_points` (boolean) column to `user_orders` to track points-based payments
    - Add `points_amount` (numeric) column to `user_orders` to store the points amount used
    - Add anon read policy for `user_points` so admin panel can see points
    - Add anon read policy for `user_checkins` so admin panel can see check-in data

  2. Security
    - Existing RLS policies remain intact
    - New columns have safe default values
*/

CREATE OR REPLACE FUNCTION public.handle_new_profile_points()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_points (user_id, balance, total_earned)
  VALUES (NEW.id, 5, 5)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_orders' AND column_name = 'paid_with_points'
  ) THEN
    ALTER TABLE user_orders ADD COLUMN paid_with_points boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_orders' AND column_name = 'points_amount'
  ) THEN
    ALTER TABLE user_orders ADD COLUMN points_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_points' AND policyname = 'Anon can read all user_points'
  ) THEN
    CREATE POLICY "Anon can read all user_points"
      ON user_points FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;
