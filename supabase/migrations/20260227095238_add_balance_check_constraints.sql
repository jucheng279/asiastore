/*
  # Add CHECK Constraints for Points Balance

  Defense-in-depth: ensure points balances can never go negative
  at the database level, regardless of application logic.

  1. Changes
    - Add CHECK constraint on user_points.balance >= 0
    - Add CHECK constraint on user_points.total_earned >= 0
    - Add CHECK constraint on user_checkins.points_awarded >= 0

  2. Important Notes
    - These constraints act as a safety net alongside application-level checks
    - Existing data is validated; migration will fail if any current values violate these constraints
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_points_balance_non_negative'
  ) THEN
    ALTER TABLE user_points ADD CONSTRAINT user_points_balance_non_negative CHECK (balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_points_total_earned_non_negative'
  ) THEN
    ALTER TABLE user_points ADD CONSTRAINT user_points_total_earned_non_negative CHECK (total_earned >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_checkins_points_awarded_non_negative'
  ) THEN
    ALTER TABLE user_checkins ADD CONSTRAINT user_checkins_points_awarded_non_negative CHECK (points_awarded >= 0);
  END IF;
END $$;
