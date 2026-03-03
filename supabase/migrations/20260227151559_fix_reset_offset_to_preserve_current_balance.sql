/*
  # Fix Points Reset Offset Calculation

  1. Modified Functions
    - `reset_points_overview_counters()` - previously stored the full raw issued
      total as the offset, which zeroed out "Ever Issued" after reset. Now subtracts
      current balance so that after reset, "Ever Issued" displays the current balance
      and "Used (Orders)" displays 0.

  2. Important Notes
    - No data is modified or deleted
    - The display formula in `get_user_activity_stats` is unchanged;
      only the stored offset value is corrected
    - After applying, re-click "Reset" in the admin UI to store corrected offsets
*/

CREATE OR REPLACE FUNCTION reset_points_overview_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issued NUMERIC;
  v_used NUMERIC;
  v_current_left NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_issued
  FROM points_audit_log
  WHERE reason IN ('registration', 'checkin', 'admin_adjustment');

  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_used
  FROM points_audit_log
  WHERE reason IN ('order_payment', 'deduction');

  SELECT COALESCE(SUM(balance), 0) INTO v_current_left
  FROM user_points;

  UPDATE points_stats_offset
  SET offset_ever_issued = v_issued - v_current_left,
      offset_ever_used = v_used,
      reset_at = now()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION reset_points_overview_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_points_overview_counters() TO authenticated;
