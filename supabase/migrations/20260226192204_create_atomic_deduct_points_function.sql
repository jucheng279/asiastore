/*
  # Create Atomic Points Deduction Function

  1. New Function
    - `deduct_user_points(p_user_id UUID, p_amount NUMERIC)`
      - Atomically deducts points from a user's balance in a single UPDATE
      - Uses WHERE balance >= p_amount to prevent overdraft (no read-then-write race)
      - Returns the new balance on success, or -1 if insufficient points
      - SECURITY DEFINER to bypass RLS and ensure consistent execution

  2. Security
    - Prevents double-spending race condition where two concurrent requests
      could both read the same balance and both succeed
    - The single UPDATE with WHERE clause is atomic at the database level

  3. Notes
    - Replaces the old client-side pattern: read balance -> check -> write new balance
    - Critical for 200+ concurrent users placing orders with points
*/

CREATE OR REPLACE FUNCTION deduct_user_points(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE user_points
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1;
  END IF;

  RETURN v_new_balance;
END;
$$;
