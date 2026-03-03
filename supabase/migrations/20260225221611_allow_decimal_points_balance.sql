/*
  # Allow Decimal Points Balance

  1. Modified Tables
    - `user_points`
      - `balance` changed from integer to numeric(10,2) to support fractional point values
      - `total_earned` changed from integer to numeric(10,2) to support fractional point values

  2. Modified Functions
    - `admin_update_user_points` parameter `p_new_balance` changed from INT to NUMERIC
      so admin panel can set decimal point values

  3. Notes
    - Prices can produce fractional totals (e.g. 51.3 points) after the 5% discount
    - The old integer columns rejected these values with "invalid input syntax for type integer"
    - No data loss: existing integer values are safely promoted to numeric
*/

ALTER TABLE user_points
  ALTER COLUMN balance TYPE numeric(10,2),
  ALTER COLUMN total_earned TYPE numeric(10,2);

CREATE OR REPLACE FUNCTION admin_update_user_points(p_user_id UUID, p_new_balance NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_points (user_id, balance)
  VALUES (p_user_id, p_new_balance)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = p_new_balance, updated_at = now();
END;
$$;
