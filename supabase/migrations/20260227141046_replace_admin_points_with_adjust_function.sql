/*
  # Replace admin_update_user_points with admin_adjust_user_points

  Switches the admin points function from a "set absolute balance" model
  to an "add or subtract an amount" model. This makes every adjustment
  explicit and reduces the risk of accidental overwrites.

  1. Removed Functions
    - `admin_update_user_points(uuid, numeric)` - dropped

  2. New Functions
    - `admin_adjust_user_points(p_user_id UUID, p_amount NUMERIC, p_operation TEXT)`
      - p_operation must be 'add' or 'subtract'
      - p_amount must be greater than zero
      - Computes new balance from current balance +/- the amount
      - Validates new balance is not negative and does not exceed 999,999
      - Upserts user_points row
      - Writes an audit log entry with the signed change amount
      - Returns the new balance as NUMERIC so the UI can display it

  3. Security
    - SECURITY DEFINER to bypass RLS (same as the old function)
    - Execution permissions granted to anon and service_role (same as before)

  4. Important Notes
    - Existing audit log entries from admin_update_user_points remain untouched
    - The audit reason stays 'admin_adjustment' for continuity
*/

DROP FUNCTION IF EXISTS admin_update_user_points(uuid, numeric);

CREATE FUNCTION admin_adjust_user_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_operation TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_change NUMERIC;
BEGIN
  IF p_operation NOT IN ('add', 'subtract') THEN
    RAISE EXCEPTION 'Invalid operation: must be add or subtract';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_current_balance := 0;
  END IF;

  IF p_operation = 'add' THEN
    v_new_balance := v_current_balance + p_amount;
    v_change := p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
    v_change := -p_amount;
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance: cannot subtract % from %', p_amount, v_current_balance;
  END IF;

  IF v_new_balance > 999999 THEN
    RAISE EXCEPTION 'Balance would exceed maximum allowed value (999,999)';
  END IF;

  INSERT INTO user_points (user_id, balance)
  VALUES (p_user_id, v_new_balance)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = v_new_balance, updated_at = now();

  INSERT INTO points_audit_log (user_id, change_amount, new_balance, reason)
  VALUES (p_user_id, v_change, v_new_balance, 'admin_adjustment');

  RETURN v_new_balance;
END;
$$;
