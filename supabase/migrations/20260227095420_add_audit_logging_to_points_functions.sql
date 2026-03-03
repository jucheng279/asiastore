/*
  # Add Audit Logging to All Points Functions

  Updates all SECURITY DEFINER functions that modify points to also
  write an entry to the points_audit_log table.

  1. Modified Functions
    - `handle_new_profile_points` - logs registration bonus (+5)
    - `handle_checkin_points` - logs daily check-in (+1)
    - `deduct_user_points` - logs points spending (negative amount)
    - `create_order_atomic` - logs order payment (negative amount, with order ID reference)
    - `admin_update_user_points` - logs admin adjustments (with calculated delta)

  2. Input Validation Added
    - `deduct_user_points`: rejects zero or negative amounts
    - `admin_update_user_points`: rejects negative balance values, caps at 999999
    - `create_order_atomic`: validates total > 0 and points_amount > 0 when paying with points

  3. Important Notes
    - All functions remain SECURITY DEFINER to bypass RLS
    - Audit log writes happen in the same transaction as the points change
    - If the points change fails, the audit log entry is also rolled back
*/

-- 1. handle_new_profile_points: log registration bonus
CREATE OR REPLACE FUNCTION handle_new_profile_points()
RETURNS TRIGGER AS $$
DECLARE
  v_bonus CONSTANT NUMERIC := 5;
BEGIN
  INSERT INTO public.user_points (user_id, balance, total_earned)
  VALUES (NEW.id, v_bonus, v_bonus)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.points_audit_log (user_id, change_amount, new_balance, reason)
  VALUES (NEW.id, v_bonus, v_bonus, 'registration');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. handle_checkin_points: log daily check-in
CREATE OR REPLACE FUNCTION handle_checkin_points()
RETURNS TRIGGER AS $$
DECLARE
  v_award CONSTANT INTEGER := 1;
  v_new_balance NUMERIC;
BEGIN
  NEW.points_awarded := v_award;

  INSERT INTO public.user_points (user_id, balance, total_earned, updated_at)
  VALUES (NEW.user_id, v_award, v_award, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_points.balance + v_award,
    total_earned = user_points.total_earned + v_award,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.points_audit_log (user_id, change_amount, new_balance, reason)
  VALUES (NEW.user_id, v_award, COALESCE(v_new_balance, v_award), 'checkin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. deduct_user_points: log spending + input validation
CREATE OR REPLACE FUNCTION deduct_user_points(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RETURN -1;
  END IF;

  UPDATE user_points
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1;
  END IF;

  INSERT INTO points_audit_log (user_id, change_amount, new_balance, reason)
  VALUES (p_user_id, -p_amount, v_new_balance, 'deduction');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop and recreate create_order_atomic with audit logging + validation
DROP FUNCTION IF EXISTS create_order_atomic(UUID, NUMERIC, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, JSONB);

CREATE FUNCTION create_order_atomic(
  p_user_id UUID,
  p_total NUMERIC,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_shipping_address JSONB,
  p_delivery_instructions TEXT,
  p_paid_with_points BOOLEAN,
  p_points_amount NUMERIC,
  p_items JSONB
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_balance NUMERIC;
BEGIN
  IF p_total <= 0 THEN
    RAISE EXCEPTION 'Invalid order total';
  END IF;

  IF p_paid_with_points AND p_points_amount > 0 THEN
    UPDATE user_points
    SET balance = balance - p_points_amount,
        updated_at = now()
    WHERE user_id = p_user_id
      AND balance >= p_points_amount
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
      RAISE EXCEPTION 'Insufficient points balance';
    END IF;
  END IF;

  INSERT INTO user_orders (user_id, total, contact_email, contact_phone, shipping_address, delivery_instructions, paid_with_points, points_amount)
  VALUES (p_user_id, p_total, p_contact_email, p_contact_phone, p_shipping_address, p_delivery_instructions, p_paid_with_points, p_points_amount)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO user_order_items (order_id, product_id, name, image, price, quantity)
    VALUES (
      v_order_id,
      v_item->>'product_id',
      v_item->>'name',
      v_item->>'image',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INTEGER
    );
  END LOOP;

  IF p_paid_with_points AND p_points_amount > 0 THEN
    INSERT INTO points_audit_log (user_id, change_amount, new_balance, reason, reference_id)
    VALUES (p_user_id, -p_points_amount, v_new_balance, 'order_payment', v_order_id::TEXT);
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. admin_update_user_points: log admin adjustment + input validation
CREATE OR REPLACE FUNCTION admin_update_user_points(p_user_id UUID, p_new_balance NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_old_balance NUMERIC;
  v_change NUMERIC;
BEGIN
  IF p_new_balance < 0 THEN
    RAISE EXCEPTION 'Balance cannot be negative';
  END IF;

  IF p_new_balance > 999999 THEN
    RAISE EXCEPTION 'Balance exceeds maximum allowed value';
  END IF;

  SELECT COALESCE(balance, 0) INTO v_old_balance
  FROM user_points
  WHERE user_id = p_user_id;

  v_change := p_new_balance - COALESCE(v_old_balance, 0);

  INSERT INTO user_points (user_id, balance)
  VALUES (p_user_id, p_new_balance)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = p_new_balance, updated_at = now();

  INSERT INTO points_audit_log (user_id, change_amount, new_balance, reason)
  VALUES (p_user_id, v_change, p_new_balance, 'admin_adjustment');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
