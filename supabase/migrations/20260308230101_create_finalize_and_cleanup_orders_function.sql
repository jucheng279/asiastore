/*
  # Create finalize_and_cleanup_orders Function

  1. New Function
    - `finalize_and_cleanup_orders()` - SECURITY DEFINER, idempotent
      - Reads store_settings to determine the ordering window schedule
      - Calculates the current and past ordering windows
      - Stock finalization: For each closed window with 'active' orders,
        deducts preserve from stock (stock = stock - preserve, preserve = 0)
        across products, expiry_items, and flash_sale_items, then marks
        those orders as 'completed'
      - Cleanup: Keeps only the 2 most recent ordering windows that contain
        orders; deletes all orders from older windows (ON DELETE CASCADE
        handles user_order_items)
      - Idempotent: safe to call multiple times with no side effects

  2. Security
    - SECURITY DEFINER to bypass RLS for cross-table operations
    - EXECUTE granted to authenticated role

  3. Notes
    - Called lazily from frontend whenever orders are viewed (user or admin)
    - No pg_cron or background scheduler needed
    - The 'completed' status is new alongside 'active' and 'cancelled'
*/

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
BEGIN
  SELECT auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_open_day, v_open_time, v_close_day, v_close_time
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

  -- STOCK FINALIZATION
  -- Check the most recently closed window (one week before current if current is open,
  -- or current window if it has already closed)
  -- We check up to 4 past windows to handle edge cases where multiple windows were missed
  FOR i IN 0..3 LOOP
    DECLARE
      v_check_start TIMESTAMPTZ;
      v_check_end TIMESTAMPTZ;
    BEGIN
      v_check_start := v_window_start - (i * INTERVAL '7 days');
      v_check_end := v_window_end - (i * INTERVAL '7 days');

      -- Only finalize windows that have already closed
      IF v_check_end >= now() THEN
        CONTINUE;
      END IF;

      -- Check if there are active orders in this closed window
      SELECT EXISTS(
        SELECT 1 FROM user_orders
        WHERE status = 'active'
          AND created_at >= v_check_start
          AND created_at < v_check_end
      ) INTO v_has_active;

      IF v_has_active THEN
        -- Finalize stock: for each product with preserve > 0, set stock = stock - preserve, preserve = 0
        UPDATE products
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        UPDATE expiry_items
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        UPDATE flash_sale_items
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        -- Mark all active orders in this closed window as completed
        UPDATE user_orders
        SET status = 'completed'
        WHERE status = 'active'
          AND created_at >= v_check_start
          AND created_at < v_check_end;
      END IF;
    END;
  END LOOP;

  -- CLEANUP: Keep only 2 most recent windows that contain orders
  -- Find all distinct windows that contain orders, ordered newest first
  v_kept_count := 0;
  FOR v_window_rec IN
    SELECT DISTINCT
      date_trunc('week', created_at - ((v_open_day - 1) || ' days')::INTERVAL) AS window_week
    FROM user_orders
    ORDER BY window_week DESC
  LOOP
    v_kept_count := v_kept_count + 1;
    IF v_kept_count > 2 THEN
      -- Delete orders from this old window
      DELETE FROM user_orders
      WHERE date_trunc('week', created_at - ((v_open_day - 1) || ' days')::INTERVAL) = v_window_rec.window_week;
    END IF;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION finalize_and_cleanup_orders() TO authenticated;
