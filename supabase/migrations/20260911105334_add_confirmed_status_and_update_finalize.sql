/*
# Add "confirmed" order status and update finalize logic

## Summary
Introduces an intermediate "confirmed" status so that orders stay visible
as the current order after the ordering window closes, until the next
ordering window opens.

## Changes

1. **finalize_and_cleanup_orders** — Updated behavior:
   - When the ordering round closes, active orders move to "confirmed"
     (instead of jumping straight to "completed"). Stock deduction and
     delivery-fee calculation still happen at this point.
   - When a NEW ordering round opens, any "confirmed" orders from prior
     windows are moved to "completed" (past orders).

2. **set_order_payment_method** — Updated to allow setting payment on
   orders with status "active" OR "confirmed" (not just any status).

## Status lifecycle
   active → confirmed (round closes) → completed (next round opens)
   active → cancelled (user cancels during open window)

## Security
   No RLS changes. Function grants unchanged.
*/

-- ============================================================
-- 1. Update finalize_and_cleanup_orders
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_and_cleanup_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_open_day INTEGER;
  v_open_time TEXT;
  v_close_day INTEGER;
  v_close_time TEXT;
  v_now_stockholm TIMESTAMP;
  v_now_ts TIMESTAMPTZ;
  v_current_iso_day INTEGER;
  v_days_to_open INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_days_span INTEGER;
  v_open_h INTEGER;
  v_open_m INTEGER;
  v_close_h INTEGER;
  v_close_m INTEGER;
  v_has_active BOOLEAN;
  v_item RECORD;
  v_window_rec RECORD;
  v_kept_count INTEGER;
  v_order_rec RECORD;
  v_subtotal NUMERIC;
  v_delivery_fee NUMERIC;
  v_is_open BOOLEAN;
  v_now_minutes INTEGER;
  v_open_minutes INTEGER;
  v_close_minutes INTEGER;
  v_ordering_mode TEXT;
  v_ordering_enabled BOOLEAN;
BEGIN
  SELECT ordering_mode, ordering_enabled, auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_ordering_mode, v_ordering_enabled, v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings
  WHERE id = 1;

  IF v_open_day IS NULL THEN
    RETURN;
  END IF;

  v_open_h := split_part(v_open_time, ':', 1)::INTEGER;
  v_open_m := split_part(v_open_time, ':', 2)::INTEGER;
  v_close_h := split_part(v_close_time, ':', 1)::INTEGER;
  v_close_m := split_part(v_close_time, ':', 2)::INTEGER;

  v_now_stockholm := now() AT TIME ZONE 'Europe/Stockholm';
  v_current_iso_day := EXTRACT(ISODOW FROM v_now_stockholm)::INTEGER;

  -- Determine if the store is currently open
  IF v_ordering_mode = 'manual' THEN
    v_is_open := v_ordering_enabled;
  ELSE
    v_now_minutes := (v_current_iso_day - 1) * 1440
      + EXTRACT(HOUR FROM v_now_stockholm)::INTEGER * 60
      + EXTRACT(MINUTE FROM v_now_stockholm)::INTEGER;
    v_open_minutes := (v_open_day - 1) * 1440 + v_open_h * 60 + v_open_m;
    v_close_minutes := (v_close_day - 1) * 1440 + v_close_h * 60 + v_close_m;

    IF v_close_minutes > v_open_minutes THEN
      v_is_open := (v_now_minutes >= v_open_minutes AND v_now_minutes < v_close_minutes);
    ELSE
      v_is_open := (v_now_minutes >= v_open_minutes OR v_now_minutes < v_close_minutes);
    END IF;
  END IF;

  -- PHASE 1: When the store is open again, move confirmed → completed
  -- (A new round has started, so prior confirmed orders become past orders)
  IF v_is_open THEN
    UPDATE user_orders
    SET status = 'completed'
    WHERE status = 'confirmed';
  END IF;

  -- PHASE 2: Finalize active orders from past (closed) windows → confirmed
  v_days_to_open := v_open_day - v_current_iso_day;
  IF v_days_to_open > 0 THEN
    v_days_to_open := v_days_to_open - 7;
  END IF;

  v_window_start := (date_trunc('day', v_now_stockholm) + (v_days_to_open || ' days')::INTERVAL
    + (v_open_h || ' hours')::INTERVAL + (v_open_m || ' minutes')::INTERVAL)
    AT TIME ZONE 'Europe/Stockholm';

  IF v_window_start > now() THEN
    v_window_start := v_window_start - INTERVAL '7 days';
  END IF;

  v_days_span := v_close_day - v_open_day;
  IF v_days_span <= 0 THEN
    v_days_span := v_days_span + 7;
  END IF;

  v_window_end := v_window_start + (v_days_span || ' days')::INTERVAL
    - (v_open_h || ' hours')::INTERVAL - (v_open_m || ' minutes')::INTERVAL
    + (v_close_h || ' hours')::INTERVAL + (v_close_m || ' minutes')::INTERVAL;

  -- STOCK FINALIZATION for past windows
  FOR i IN 0..3 LOOP
    DECLARE
      v_check_start TIMESTAMPTZ;
      v_check_end TIMESTAMPTZ;
    BEGIN
      v_check_start := v_window_start - (i * INTERVAL '7 days');
      v_check_end := v_window_end - (i * INTERVAL '7 days');

      IF v_check_end >= now() THEN
        CONTINUE;
      END IF;

      SELECT EXISTS(
        SELECT 1 FROM user_orders
        WHERE status = 'active'
          AND created_at >= v_check_start
          AND created_at < v_check_end
      ) INTO v_has_active;

      IF v_has_active THEN
        UPDATE products
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        UPDATE expiry_items
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        UPDATE flash_sale_items
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        -- Apply delivery fee and move to confirmed (not completed)
        FOR v_order_rec IN
          SELECT id FROM user_orders
          WHERE status = 'active'
            AND created_at >= v_check_start
            AND created_at < v_check_end
        LOOP
          SELECT COALESCE(SUM(price * quantity), 0) INTO v_subtotal
          FROM user_order_items WHERE order_id = v_order_rec.id;

          IF v_subtotal < 50 THEN
            v_delivery_fee := 20;
          ELSE
            v_delivery_fee := 0;
          END IF;

          UPDATE user_orders
          SET total = v_subtotal + v_delivery_fee,
              status = 'confirmed'
          WHERE id = v_order_rec.id;
        END LOOP;
      END IF;
    END;
  END LOOP;

  -- CLEANUP: Keep only 2 most recent windows that contain orders
  v_kept_count := 0;
  FOR v_window_rec IN
    SELECT DISTINCT
      date_trunc('week', created_at - ((v_open_day - 1) || ' days')::INTERVAL) AS window_week
    FROM user_orders
    ORDER BY window_week DESC
  LOOP
    v_kept_count := v_kept_count + 1;
    IF v_kept_count > 2 THEN
      DELETE FROM user_orders
      WHERE date_trunc('week', created_at - ((v_open_day - 1) || ' days')::INTERVAL) = v_window_rec.window_week;
    END IF;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION finalize_and_cleanup_orders() TO authenticated;

-- ============================================================
-- 2. Update set_order_payment_method to guard status
-- ============================================================
CREATE OR REPLACE FUNCTION set_order_payment_method(
  p_order_id UUID,
  p_payment_method TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
  v_status TEXT;
  v_subtotal NUMERIC;
  v_shipping NUMERIC;
  v_points_discount NUMERIC;
  v_total NUMERIC;
  v_user_points NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_payment_method NOT IN ('cashOrSwish', 'points', 'payAtStore') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT user_id, status, total INTO v_owner, v_status, v_subtotal
  FROM user_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Only allow payment selection on confirmed orders (round closed, awaiting delivery)
  IF v_status NOT IN ('active', 'confirmed') THEN
    RAISE EXCEPTION 'Payment can only be set on active or confirmed orders';
  END IF;

  -- Calculate final total with delivery fee
  IF v_subtotal >= 50 THEN
    v_shipping := 0;
  ELSE
    v_shipping := 20;
  END IF;

  IF p_payment_method = 'points' THEN
    v_points_discount := (v_subtotal + v_shipping) * 0.10;
    v_total := v_subtotal + v_shipping - v_points_discount;

    SELECT balance INTO v_user_points
    FROM user_points WHERE user_id = v_uid;

    IF COALESCE(v_user_points, 0) < v_total THEN
      RAISE EXCEPTION 'Insufficient points';
    END IF;

    UPDATE user_orders
    SET payment_method = p_payment_method,
        paid_with_points = true,
        points_amount = v_total,
        total = v_total
    WHERE id = p_order_id;
  ELSE
    v_total := v_subtotal + v_shipping;
    UPDATE user_orders
    SET payment_method = p_payment_method,
        paid_with_points = false,
        points_amount = 0,
        total = v_total
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subtotal', round(v_subtotal, 2),
    'shipping', round(v_shipping, 2),
    'total', round(v_total, 2)
  );
END;
$fn$;
