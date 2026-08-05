/*
  # Reject group container product IDs in orders

  1. Purpose
    - A "group container" is a product that has variant children (other products with parent_product_id pointing to it).
    - Group containers are display-only; they are not purchasable products.
    - This migration adds a guard to create_order_atomic that rejects any order
      containing a product ID that is a group container.

  2. Changes
    - Replaces the create_order_atomic wrapper function to add a check AFTER
      quantity validation that verifies no submitted product_id has children
      in the products table.

  3. Security
    - Same SECURITY DEFINER, same search_path, same grants as before.
    - This is the server-side enforcement layer preventing group containers
      from being ordered even if the front-end has a bug.
*/

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID,
  p_total NUMERIC,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_shipping_address JSONB,
  p_delivery_instructions TEXT,
  p_paid_with_points BOOLEAN,
  p_points_amount NUMERIC,
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cashOrSwish'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wrap$
DECLARE
  v_uid UUID := auth.uid();
  v_item JSONB;
  v_calc_input JSONB := '[]'::jsonb;
  v_calc JSONB;
  v_priced JSONB := '[]'::jsonb;
  v_qty INTEGER;
  v_pid TEXT;
  v_unit NUMERIC;
  v_total NUMERIC;
  v_points NUMERIC := 0;
  v_group_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Validate quantities and build the pricing request
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := v_item->>'product_id';
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'Invalid item';
    END IF;

    BEGIN
      v_qty := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid quantity';
    END;

    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 999 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    v_calc_input := v_calc_input || jsonb_build_object('productId', v_pid, 'quantity', v_qty);
  END LOOP;

  -- Reject group containers: products that have children are display-only, not purchasable
  SELECT COUNT(*) INTO v_group_count
  FROM jsonb_array_elements(v_calc_input) AS elem
  WHERE EXISTS (
    SELECT 1 FROM products
    WHERE products.parent_product_id = (elem->>'productId')::uuid
    LIMIT 1
  );

  IF v_group_count > 0 THEN
    RAISE EXCEPTION 'Cannot order a product group container; select individual variants instead';
  END IF;

  -- Recompute prices and totals server-side; the client's numbers are ignored
  v_calc := calculate_order_total(v_calc_input, COALESCE(p_paid_with_points, false));

  IF v_calc ? 'error' THEN
    RAISE EXCEPTION 'Order could not be priced';
  END IF;

  v_total := (v_calc->>'total')::NUMERIC;

  IF COALESCE(p_paid_with_points, false) THEN
    v_points := v_total;
  END IF;

  -- Rebuild the item list with server-derived unit prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := v_item->>'product_id';
    v_qty := (v_item->>'quantity')::INTEGER;

    SELECT (e->>'unitPrice')::NUMERIC
    INTO v_unit
    FROM jsonb_array_elements(v_calc->'items') AS e
    WHERE e->>'productId' = v_pid
    LIMIT 1;

    IF v_unit IS NULL THEN
      RAISE EXCEPTION 'Order could not be priced';
    END IF;

    v_priced := v_priced || jsonb_build_object(
      'product_id', v_pid,
      'name', v_item->>'name',
      'image', v_item->>'image',
      'price', v_unit,
      'quantity', v_qty
    );
  END LOOP;

  RETURN create_order_atomic_internal(
    v_uid,
    v_total,
    p_contact_email,
    p_contact_phone,
    p_shipping_address,
    p_delivery_instructions,
    COALESCE(p_paid_with_points, false),
    v_points,
    v_priced,
    p_payment_method
  );
END;
$wrap$;

REVOKE ALL ON FUNCTION public.create_order_atomic(
  uuid, numeric, text, text, jsonb, text, boolean, numeric, jsonb, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(
  uuid, numeric, text, text, jsonb, text, boolean, numeric, jsonb, text
) TO authenticated;
