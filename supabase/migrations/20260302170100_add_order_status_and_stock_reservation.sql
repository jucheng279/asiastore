/*
  # Add Order Status and Stock Reservation System

  1. Modified Tables
    - `user_orders`
      - Add `status` column (text, default 'active') 
      - Allowed values: 'active', 'cancelled'

  2. Updated Functions
    - `create_order_atomic` now validates and reserves stock
      - For each ordered item, checks available stock (stock - preserve) across products, expiry_items, flash_sale_items
      - Increments `preserve` column by ordered quantity
      - Raises exception if insufficient stock

  3. New Functions
    - `cancel_order_atomic(p_user_id UUID, p_order_id UUID)`
      - Sets order status to 'cancelled'
      - Decrements preserve for each item in the order
      - Refunds points if order was paid with points
      - Returns true on success

  4. Security
    - Both functions run as SECURITY DEFINER for transactional integrity
    - cancel_order_atomic validates order ownership
    - Execution granted to authenticated role

  5. Notes
    - preserve represents active/pending orders only
    - Cancellation releases reserved stock by decrementing preserve
    - Points are refunded on cancellation if the order was paid with points
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_orders ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

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
    FROM products WHERE id = v_product_id::UUID;

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
      FROM expiry_items WHERE id = v_product_id::UUID;

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
      FROM flash_sale_items WHERE id = v_product_id::UUID;

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

CREATE OR REPLACE FUNCTION cancel_order_atomic(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT id, user_id, status, paid_with_points, points_amount
  INTO v_order
  FROM user_orders
  WHERE id = p_order_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'active' THEN
    RAISE EXCEPTION 'Order is not active';
  END IF;

  UPDATE user_orders SET status = 'cancelled' WHERE id = p_order_id;

  FOR v_item IN
    SELECT product_id, quantity FROM user_order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET preserve = GREATEST(0, preserve - v_item.quantity)
    WHERE id = v_item.product_id::UUID;

    UPDATE expiry_items
    SET preserve = GREATEST(0, preserve - v_item.quantity)
    WHERE id = v_item.product_id::UUID;

    UPDATE flash_sale_items
    SET preserve = GREATEST(0, preserve - v_item.quantity)
    WHERE id = v_item.product_id::UUID;
  END LOOP;

  IF v_order.paid_with_points AND v_order.points_amount > 0 THEN
    UPDATE user_points
    SET balance = balance + v_order.points_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN true;
END;
$fn$;

GRANT EXECUTE ON FUNCTION cancel_order_atomic(UUID, UUID) TO authenticated;
