/*
  # Restore reset_points_overview_counters function

  The lockdown migration (20260301195254) replaced this function with a broken
  version that uses sign-based splitting (change_amount > 0 / < 0) instead of
  the correct reason-based filtering. It also set search_path = '' which breaks
  unqualified table references.

  1. Modified Functions
    - `reset_points_overview_counters()` - Restores correct reason-based offset
      logic from migration 20260227151559, adds is_admin() security guard from
      the lockdown, and sets search_path = public

  2. Security
    - Retains is_admin() check (defense-in-depth from lockdown)
    - SECURITY DEFINER with search_path = public
    - Revokes PUBLIC access, grants only to authenticated and service_role
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can reset points counters';
  END IF;

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
GRANT EXECUTE ON FUNCTION reset_points_overview_counters() TO service_role;
