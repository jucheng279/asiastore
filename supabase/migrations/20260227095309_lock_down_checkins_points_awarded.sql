/*
  # Lock Down Checkins - Hardcode Points Awarded

  Previously, the handle_checkin_points trigger used NEW.points_awarded
  from the user's INSERT, meaning a user could insert a checkin with
  points_awarded = 999999 to give themselves arbitrary points.

  1. Changes
    - Replace handle_checkin_points trigger function to always award exactly 1 point,
      ignoring whatever value the user supplies in points_awarded
    - Add CHECK constraint ensuring points_awarded = 1 as additional defense

  2. Security
    - Users can no longer manipulate the points_awarded column to gain extra points
    - The trigger now hardcodes the award amount
    - The CHECK constraint prevents any bypass at the row level
*/

CREATE OR REPLACE FUNCTION handle_checkin_points()
RETURNS TRIGGER AS $$
DECLARE
  v_award CONSTANT INTEGER := 1;
BEGIN
  NEW.points_awarded := v_award;

  INSERT INTO public.user_points (user_id, balance, total_earned, updated_at)
  VALUES (NEW.user_id, v_award, v_award, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_points.balance + v_award,
    total_earned = user_points.total_earned + v_award,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_checkins_points_awarded_fixed'
  ) THEN
    ALTER TABLE user_checkins ADD CONSTRAINT user_checkins_points_awarded_fixed CHECK (points_awarded = 1);
  END IF;
END $$;
