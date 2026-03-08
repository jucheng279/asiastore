/*
  # Update cancel_order_atomic with Window Guard

  1. Modified Functions
    - `cancel_order_atomic(p_user_id UUID, p_order_id UUID)`
      - Calls finalize_and_cleanup_orders() at the start to ensure order statuses are up-to-date
      - After fetching the order, reads store_settings to determine the current ordering window
      - Calculates whether the order was placed in the currently open window
      - Only allows cancellation if the ordering window is currently open AND the order was placed within it
      - Rejects cancellation with clear error messages if:
        - The order status is 'completed' (window already closed and finalized)
        - The ordering window has closed (order belongs to a past window)

  2. Security
    - Still SECURITY DEFINER for transactional integrity
    - Still validates order ownership (user_id match)

  3. Notes
    - The window guard runs at the DB level so it cannot be bypassed from the client
    - The UI also hides the cancel button, but this provides a second layer of protection
*/

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
  v_open_day INTEGER;
  v_open_time TEXT;
  v_close_day INTEGER;
  v_close_time TEXT;
  v_ordering_mode TEXT;
  v_ordering_enabled BOOLEAN;
  v_now_stockholm TIMESTAMP;
  v_current_iso_day INTEGER;
  v_days_to_open INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_days_span INTEGER;
  v_open_h INTEGER;
  v_open_m INTEGER;
  v_close_h INTEGER;
  v_close_m INTEGER;
  v_now_minutes INTEGER;
  v_open_minutes INTEGER;
  v_close_minutes INTEGER;
  v_store_open BOOLEAN;
BEGIN
  PERFORM finalize_and_cleanup_orders();

  SELECT id, user_id, status, paid_with_points, points_amount, created_at
  INTO v_order
  FROM user_orders
  WHERE id = p_order_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'Order has been completed and cannot be cancelled';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  SELECT ordering_mode, ordering_enabled, auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_ordering_mode, v_ordering_enabled, v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings
  WHERE id = 1;

  IF v_ordering_mode IS NOT NULL THEN
    v_open_h := split_part(v_open_time, ':', 1)::INTEGER;
    v_open_m := split_part(v_open_time, ':', 2)::INTEGER;
    v_close_h := split_part(v_close_time, ':', 1)::INTEGER;
    v_close_m := split_part(v_close_time, ':', 2)::INTEGER;

    IF v_ordering_mode = 'manual' THEN
      IF NOT v_ordering_enabled THEN
        RAISE EXCEPTION 'Cancellation is no longer available -- ordering window has closed';
      END IF;
    ELSE
      v_now_stockholm := now() AT TIME ZONE 'Europe/Stockholm';
      v_current_iso_day := EXTRACT(ISODOW FROM v_now_stockholm)::INTEGER;
      v_now_minutes := (v_current_iso_day - 1) * 1440
        + EXTRACT(HOUR FROM v_now_stockholm)::INTEGER * 60
        + EXTRACT(MINUTE FROM v_now_stockholm)::INTEGER;

      v_open_minutes := (v_open_day - 1) * 1440 + v_open_h * 60 + v_open_m;
      v_close_minutes := (v_close_day - 1) * 1440 + v_close_h * 60 + v_close_m;

      v_store_open := false;
      IF v_close_minutes > v_open_minutes THEN
        v_store_open := (v_now_minutes >= v_open_minutes AND v_now_minutes < v_close_minutes);
      ELSE
        v_store_open := (v_now_minutes >= v_open_minutes OR v_now_minutes < v_close_minutes);
      END IF;

      IF NOT v_store_open THEN
        RAISE EXCEPTION 'Cancellation is no longer available -- ordering window has closed';
      END IF;

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

      IF v_order.created_at < v_window_start OR v_order.created_at >= v_window_end THEN
        RAISE EXCEPTION 'Cancellation is no longer available -- ordering window has closed';
      END IF;
    END IF;
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
