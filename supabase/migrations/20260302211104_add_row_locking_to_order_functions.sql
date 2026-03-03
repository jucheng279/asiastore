/*
  # Add row-level locking to create_order_atomic

  1. Changes
    - Replace plain SELECT with SELECT ... FOR UPDATE in create_order_atomic
    - This locks each product row before reading stock/preserve, preventing
      concurrent transactions from reading stale values

  2. Purpose
    - Eliminates the check-then-act race condition entirely
    - When two orders target the same product simultaneously, the second
      transaction waits at SELECT (not UPDATE), so its availability check
      uses the already-committed values from the first transaction
    - Combined with the preserve <= stock CHECK constraint, this provides
      two layers of protection against overselling

  3. Important Notes
    - The row lock is held only for the duration of the transaction
    - Only the specific product row being ordered is locked, not the whole table
    - Other products can still be ordered concurrently without contention
    - The SECURITY DEFINER and grant settings remain unchanged
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
AS $fn$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_balance NUMERIC;
  v_product_id TEXT;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  v_current_preserve INTEGER;
  v_available INTEGER;
  v_found BOOLEAN;
  v_product_name TEXT;
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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_found := false;

    SELECT stock, preserve, name_en
    INTO v_current_stock, v_current_preserve, v_product_name
    FROM products WHERE id = v_product_id::UUID
    FOR UPDATE;

    IF FOUND THEN
      v_found := true;
      v_available := v_current_stock - v_current_preserve;
      IF v_available < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
      END IF;
      UPDATE products SET preserve = preserve + v_quantity WHERE id = v_product_id::UUID;
    END IF;

    IF NOT v_found THEN
      SELECT stock, preserve, name_en
      INTO v_current_stock, v_current_preserve, v_product_name
      FROM expiry_items WHERE id = v_product_id::UUID
      FOR UPDATE;

      IF FOUND THEN
        v_found := true;
        v_available := v_current_stock - v_current_preserve;
        IF v_available < v_quantity THEN
          RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
        END IF;
        UPDATE expiry_items SET preserve = preserve + v_quantity WHERE id = v_product_id::UUID;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT stock, preserve, name_en
      INTO v_current_stock, v_current_preserve, v_product_name
      FROM flash_sale_items WHERE id = v_product_id::UUID
      FOR UPDATE;

      IF FOUND THEN
        v_found := true;
        v_available := v_current_stock - v_current_preserve;
        IF v_available < v_quantity THEN
          RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
        END IF;
        UPDATE flash_sale_items SET preserve = preserve + v_quantity WHERE id = v_product_id::UUID;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO user_orders (user_id, total, contact_email, contact_phone, shipping_address, delivery_instructions, paid_with_points, points_amount, status)
  VALUES (p_user_id, p_total, p_contact_email, p_contact_phone, p_shipping_address, p_delivery_instructions, p_paid_with_points, p_points_amount, 'active')
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
$fn$;
