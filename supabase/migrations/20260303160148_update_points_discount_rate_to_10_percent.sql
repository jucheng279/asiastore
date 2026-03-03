/*
  # Update points discount rate from 5% to 10%

  1. Modified Function
    - `calculate_order_total(p_items jsonb, p_pay_with_points boolean)`
      - Changed `v_points_discount_rate` from 0.05 (5%) to 0.10 (10%)
      - All other business rules remain unchanged

  2. Business Rules (unchanged except discount rate)
    - Tax rate: 25%
    - Free shipping threshold: 35 (currency units)
    - Shipping fee: 5 (currency units)
    - Points discount rate: 10% of total before discount (was 5%)
*/

CREATE OR REPLACE FUNCTION calculate_order_total(
  p_items jsonb,
  p_pay_with_points boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tax_rate numeric := 0.25;
  v_free_shipping_threshold numeric := 35;
  v_shipping_fee numeric := 5;
  v_points_discount_rate numeric := 0.10;
  v_subtotal numeric := 0;
  v_shipping numeric;
  v_tax numeric;
  v_points_discount numeric;
  v_total numeric;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_unit_price numeric;
  v_items_out jsonb := '[]'::jsonb;
  v_line_total numeric;
  v_found boolean;
  v_price numeric;
  v_sale_price numeric;
  v_flash_price numeric;
  v_flash_sale_price numeric;
  v_flash_days int;
  v_flash_start date;
  v_flash_end date;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'No items provided');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    v_found := false;
    v_unit_price := NULL;

    SELECT p.price, p.sale_price INTO v_price, v_sale_price
    FROM products p WHERE p.id = v_product_id;

    IF FOUND THEN
      v_found := true;
      IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
        v_unit_price := v_sale_price;
      ELSE
        v_unit_price := v_price;
      END IF;

      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_flash_price, v_flash_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi
      WHERE fsi.source_product_id = v_product_id
        AND fsi.visible = true
        AND fsi.parent_flash_item_id IS NULL;

      IF FOUND THEN
        v_flash_end := v_flash_start + v_flash_days;
        IF v_flash_end > CURRENT_DATE THEN
          IF v_flash_sale_price IS NOT NULL AND v_flash_sale_price < v_flash_price THEN
            v_unit_price := v_flash_sale_price;
          ELSE
            v_unit_price := v_flash_price;
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT e.price, e.sale_price INTO v_price, v_sale_price
      FROM expiry_items e WHERE e.id = v_product_id;

      IF FOUND THEN
        v_found := true;
        IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          v_unit_price := v_price;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_price, v_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi WHERE fsi.id = v_product_id;

      IF FOUND THEN
        v_found := true;
        v_flash_end := v_flash_start + v_flash_days;
        IF v_flash_end > CURRENT_DATE AND v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
            v_unit_price := v_sale_price;
          ELSE
            v_unit_price := v_price;
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      RETURN jsonb_build_object('error', 'Product ' || v_product_id || ' not found');
    END IF;

    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_items_out := v_items_out || jsonb_build_object(
      'productId', v_product_id,
      'quantity', v_quantity,
      'unitPrice', v_unit_price,
      'lineTotal', v_line_total
    );
  END LOOP;

  IF v_subtotal >= v_free_shipping_threshold THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_shipping_fee;
  END IF;

  v_tax := v_subtotal * v_tax_rate;

  IF p_pay_with_points THEN
    v_points_discount := (v_subtotal + v_shipping + v_tax) * v_points_discount_rate;
  ELSE
    v_points_discount := 0;
  END IF;

  v_total := v_subtotal + v_shipping + v_tax - v_points_discount;

  RETURN jsonb_build_object(
    'subtotal', round(v_subtotal, 2),
    'shipping', round(v_shipping, 2),
    'tax', round(v_tax, 2),
    'pointsDiscount', round(v_points_discount, 2),
    'total', round(v_total, 2),
    'items', v_items_out
  );
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_order_total(jsonb, boolean) TO anon;
GRANT EXECUTE ON FUNCTION calculate_order_total(jsonb, boolean) TO authenticated;