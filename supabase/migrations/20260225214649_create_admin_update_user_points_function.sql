/*
  # Create admin_update_user_points function

  1. New Function
    - `admin_update_user_points(p_user_id UUID, p_new_balance INT)`
      - SECURITY DEFINER function that bypasses RLS
      - Performs an upsert on `user_points` to set the new balance
      - Returns void
  2. Security
    - Uses SECURITY DEFINER to execute with owner privileges
    - Encapsulates the exact operation allowed, preventing arbitrary writes
*/

CREATE OR REPLACE FUNCTION admin_update_user_points(p_user_id UUID, p_new_balance INT)
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
