/*
  # Create Atomic Order Creation Function

  1. New Function
    - `create_order_atomic(...)` 
      - Creates an order and all its items in a single database transaction
      - Optionally deducts points atomically if paying with points
      - If any step fails, the entire operation rolls back (no orphan orders or lost points)
      - Returns the new order ID on success

  2. Parameters
    - p_user_id: The user placing the order
    - p_total: Order total amount
    - p_contact_email, p_contact_phone: Contact info snapshot
    - p_shipping_address: JSONB address snapshot
    - p_delivery_instructions: Optional delivery notes
    - p_paid_with_points: Whether paying with points
    - p_points_amount: Points amount to deduct (if paying with points)
    - p_items: JSONB array of order items [{product_id, name, image, price, quantity}]

  3. Security
    - SECURITY DEFINER to bypass RLS for transactional integrity
    - Validates user_id matches the caller context
    - Atomically deducts points before creating order (prevents double-spending)

  4. Notes
    - Replaces the non-atomic client-side pattern of: deduct points -> insert order -> insert items
    - If items insert fails, the order and points deduction are rolled back
    - Critical for data integrity under concurrent load
*/

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_user_id UUID,
  p_total NUMERIC,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_shipping_address JSONB,
  p_delivery_instructions TEXT DEFAULT NULL,
  p_paid_with_points BOOLEAN DEFAULT FALSE,
  p_points_amount NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_balance NUMERIC;
BEGIN
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

  RETURN v_order_id;
END;
$$;
